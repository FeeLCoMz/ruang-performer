import React, { useState, useEffect, useRef, useMemo } from 'react';
import SongChordsAnalyzer from '../components/SongChordsAnalyzer.jsx';
import SongLyricsMainSection from '../components/SongLyricsMainSection.jsx';
import SetlistNavFooter from '../components/SetlistNavFooter.jsx';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import SongMediaPanel from '../components/SongMediaPanel.jsx';
import SongChordsInfo from '../components/SongChordsInfo.jsx';
import { getAuthHeader } from '../utils/auth.js';import { useAuth } from '../contexts/AuthContext.jsx';
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS } from '../utils/permissionUtils.js';
import { useSongFetch } from '../hooks/useSongFetch.js';
import { SongDetailSkeleton } from '../components/LoadingSkeleton.jsx';
import { handleExportText, handleExportPDF, handleShare } from '../utils/songHandlers.js';
import useMetronome from '../modules/metronome/useMetronome.js';
import useChordStats from '../hooks/useChordStats.js';
import { fetchSetLists, fetchSetListById, updateSongMastery, deleteSong } from '../apiClient.js';
import { recommendPianoFriendlyKey, extractDetectedInstrumentsFromLyrics, getTransposeSteps } from '../utils/chordUtils.js';
import { extractSectionOverview } from '../utils/songFormUtils.js';

/**
 * SongChordsPage
 * Halaman utama untuk menampilkan lirik, chord, dan kontrol lagu.
 * Mendukung konteks setlist, navigasi antar lagu, transpose, autoscroll, dan fitur media.
 *
 * Props:
 *   - song: (optional) data lagu yang diterima dari parent
 */
export default function SongChordsPage({ song: songProp, activeSetlist = null, songs: songsProp = null }) {
  // State untuk toggle tampilan partitur
  const [showSheetMusic, setShowSheetMusic] = useState(false);
  // =========================
  // 1. Routing & Context
  // =========================
  const navigate = useNavigate();
  const location = useLocation();
  const { id: songId, setlistId: routeSetlistId } = useParams();
  const { user } = useAuth();
  const currentUserId = user?.userId || user?.id;

  // Tutup partitur saat berpindah lagu supaya state tidak terbawa ke lagu berikutnya
  const sheetMusicSongId = songProp?.id;
  useEffect(() => {
    setShowSheetMusic(false);
  }, [sheetMusicSongId]);

  // =========================
  // 2. Permission Handling
  // =========================
  // Dapatkan bandId dan info role user
  const bandId = songProp?.bandId || songProp?.band_id || undefined;
  const userBandInfo = user && bandId
    ? { role: user?.bandRoles?.[bandId] || user?.role || 'member', bandId }
    : user ? { role: user?.role || 'member' } : null;
  const { can } = usePermission(bandId, userBandInfo);

  // =========================
  // 3. State: Data Lagu (via custom hook)
  // =========================
  const { song: fetchedSong, loading, error, setSong: setFetchedSong } = useSongFetch(songId);

  // =========================
  // 4. State: Setlist Context
  // =========================
  // Metadata lagu dalam setlist (jika ada). Sumber utama: state rute yang
  // dikirim dari SetlistSongsPage. Fallback: setlistSongMeta pada setlist
  // aktif — penting karena location.state hilang saat refresh / buka link
  // langsung, tanpa fallback ini key kembali ke key lagu master.
  // Jika setlist aktif sama sekali belum terload (link langsung di sesi baru),
  // state directLinkedSetlist (di-fetch di bawah) mengisi perannya.
  const [directLinkedSetlist, setDirectLinkedSetlist] = useState(null);
  const isSetlistRoute = typeof location?.pathname === 'string' && location.pathname.startsWith('/setlists/');
  const setlistId = isSetlistRoute ? (location.state?.setlistId || activeSetlist?.id || routeSetlistId || null) : null;
  // Setlist aktif untuk navigasi antar lagu di panel lirik: dari state rute,
  // fallback ke activeSetlist dari parent.
  const navSetlist = isSetlistRoute
    ? (location.state?.setlist || activeSetlist || directLinkedSetlist)
    : (activeSetlist || null);
  const setlistSongDataFallback = (() => {
    // Endpoint daftar setlist memakai nama field setlistSongMeta, endpoint
    // detail /:id memakai songKeys (plus alias setlistSongMeta setelah
    // perbaikan backend). Baca keduanya agar refresh / link langsung tetap
    // mendapat key override.
    const metaSource = navSetlist?.setlistSongMeta || navSetlist?.songKeys || {};
    const meta = metaSource?.[songId];
    if (!meta || typeof meta !== 'object') return {};
    return {
      key: meta.key,
      tempo: meta.tempo,
      genre: meta.genre,
    };
  })();
  // Ketika setlist aktif, Info tab HARUS membaca setlistSongMeta lagu ini
  // terlebih dahulu — tidak peduli lagu dibuka dari route setlist maupun dari
  // /songs/view/:id sementara setlist masih aktif (location.state tidak ada).
  const activeSetlistSongIds = navSetlist && Array.isArray(navSetlist.songs)
    ? navSetlist.songs.map((s) => String(typeof s === 'object' && s !== null ? s.id : s))
    : null;
  const isInActiveSetlist = Boolean(
    isSetlistRoute
    || (activeSetlistSongIds && activeSetlistSongIds.includes(String(songId)))
  );
  const setlistSongData = isInActiveSetlist
    // setlistSongMeta (fallback) SELALU menang: location.state.setlistSong bisa
    // berasal dari pool lagu master (mis. navigasi antar lagu lewat footer
    // setlist), yang key-nya belum override — meta setlist harusnya otoritatif.
    ? { ...(location.state?.setlistSong || {}), ...setlistSongDataFallback }
    : {};
  const autoStartMetronome = isSetlistRoute && location.state?.autoStartMetronome === true;
  const autoPlayVideo = isSetlistRoute && location.state?.autoPlayVideo === true;

   // =========================
  // 6. Data Lagu & Metadata
  // =========================
  // Gunakan fetchedSong jika sudah ada, fallback ke object kosong
  // Deteksi metadata "Original Key: X" di lirik (hanya sebagai informasi, tidak mempengaruhi transpose)
  let song = fetchedSong || {};
  let lyricsMetaKey = ''; // Kunci asli dari metadata lirik — hanya informasi
  let lyricsClean = song.lyrics || '';
  let lyricsForExport = lyricsClean; // Untuk export (tanpa duplik "Original Key:")
  if (lyricsClean) {
    // Format: Original Key: C, Cm, C#, F#m, Dmaj7, G7, etc.
    // Menangkap berbagai format notasi chord (single/double accidental + mode/extension)
    const metaMatch = lyricsClean.match(/^Original\s+Key:\s*([A-G][#b]?(?:maj|min|M|m|add|sus|dim|aug|7|maj7|min7|dom7|b5|#5|\+|-)?(?:7|9|11|13)?\s*(?:major|minor)?[)]?(?:\s|$))/im);
    if (metaMatch) {
      lyricsMetaKey = metaMatch[1].trim();
      // Buat versi untuk export tanpa duplikat "Original Key:"
      lyricsForExport = lyricsClean.replace(/^Original\s+Key:.*$/im, '').replace(/^\s*\n/, '');
    }
  }
  const artist = setlistSongData.artist || song?.artist || '';
  // Key & tempo lintas-tab: dipegang sebagai state di halaman supaya perubahan
  // dari panel lirik langsung terlihat di tab Info (dan sebaliknya).
  const baseKey = setlistSongData.key || song?.key || '';
  const baseTempo = setlistSongData.tempo || song?.tempo || '';
  const [editableKey, setEditableKey] = useState(baseKey);
  const [editableTempo, setEditableTempo] = useState(baseTempo);
  // Ikuti data lagu terbaru (mis. hasil fetch ulang) bila user belum mengubah
  useEffect(() => {
    setEditableKey(baseKey);
  }, [baseKey]);
  useEffect(() => {
    setEditableTempo(baseTempo);
  }, [baseTempo]);
  const key = editableKey;
  const tempo = editableTempo;
  const handleSongKeyChange = (nextKey) => setEditableKey(nextKey || '');
  const handleSongTempoChange = (nextTempo) => setEditableTempo(nextTempo || '');
  const genre = setlistSongData.genre || song?.genre || '';
  const keyboardPatch = setlistSongData.keyboardPatch || song?.keyboardPatch || song?.keyboard_patch || '';
  const timeSignature = setlistSongData.time_signature || song?.time_signature || '4/4';
  const youtubeId = song?.youtubeId || song?.youtube_url || '';
  const timeMarkers = song?.time_markers || [];

  // Mode performance dikendalikan dari app header (prop dari App), jadi bisa
  // di-switch kapan saja — termasuk untuk lagu di luar setlist.
  // Transpose & metronom
  const [transpose, setTranspose] = useState(0);

  const [isMetronomeActive, setIsMetronomeActive] = useMetronome(false, Number(tempo) || 120);

  // Saat pindah lagu: reset transpose DAN auto-apply ke key setlist lagu baru.
  // Auto-apply harus di level halaman (bukan hanya di TransposeKeyControl tab
  // Info) karena kontrol transpose di toolbar lirik memakai disableAutoApply —
  // tanpa ini, pindah lagu saat berada di tab Lirik membuat transpose tetap 0
  // dan tampilan kembali ke key lagu master.
  const autoAppliedKeyPairRef = React.useRef(null);
  useEffect(() => {
    const originalSongKey = song?.key || '';
    const targetSetlistKey = setlistSongData.key || '';
    const keyPair = `${song?.id}::${originalSongKey}::${targetSetlistKey}`;
    if (autoAppliedKeyPairRef.current === keyPair) return;
    autoAppliedKeyPairRef.current = keyPair;

    if (!originalSongKey || !targetSetlistKey) {
      setTranspose(0);
      return;
    }
    const steps = getTransposeSteps(originalSongKey, targetSetlistKey);
    setTranspose(steps === null ? 0 : steps);
  }, [song?.id, song?.key, setlistSongData.key]);

  const [zoom, setZoom] = useState(1);
  const [showChordNumbers, setShowChordNumbers] = useState(false);
  const [showJazzChords, setShowJazzChords] = useState(false);
  const [showSimpleChords, setShowSimpleChords] = useState(false);

  const chordStats = useChordStats(song?.lyrics);

  const pianoRecommendation = recommendPianoFriendlyKey({
    chords: chordStats.chords,
    key: song?.key || key,
    transpose,
  });

  const detectedInstruments = useMemo(() => {
    return extractDetectedInstrumentsFromLyrics(song?.lyrics || '');
  }, [song?.lyrics]);

  // Setlists state for showing which setlists contain this song
  const [setlists, setSetlists] = useState([]);
  const [loadingSetlists, setLoadingSetlists] = useState(false);

  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);


  // Share state
  const [shareMessage, setShareMessage] = useState('');
  const [updatingMastery, setUpdatingMastery] = useState(false);
  // State hapus lagu (dipanggil dari tab Info) — hooks harus di atas early return
  const [deletingSong, setDeletingSong] = useState(false);


  // Tab samping aktif — mengikuti lagu saat berpindah lagu: default Video.
  const [activeTab, setActiveTab] = useState('media');

  // Reset tab ke Video saat pindah lagu (lagu baru mungkin punya/tak punya video).
  useEffect(() => {
    setActiveTab('media');
  }, [songId]);

  const youtubeRef = useRef(null);
  const autoMetronomeStartedRef = useRef(false);
  const autoVideoPlayStartedRef = useRef(false);

  // AudioContext logic now handled by useMetronome

  // Auto Scroll state
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(parseInt(tempo) || 120);
  // Switchable Mode autoscroll: 'MUSICAL' (BPM) / 'MANUAL' (Level 1-10)
  const [autoScrollMode, setAutoScrollMode] = useState('MUSICAL');
  const [manualSpeedLevel, setManualSpeedLevel] = useState(5);
  const lyricsDisplayRef = useRef(null);

  // Real playback state for the timestamp play buttons. Without this the button
  // could only ever seek: ChordDisplay used to guess locally, and once that was
  // removed it received no state at all, so it never showed "pause".
  const [isYoutubePlaying, setIsYoutubePlaying] = useState(false);
  // Posisi & durasi video untuk panel media (label waktu & time marker).
  const [ytCurrentTime, setYtCurrentTime] = useState(0);
  const [ytDuration, setYtDuration] = useState(0);

  useEffect(() => {
    if (!youtubeId) {
      setIsYoutubePlaying(false);
      return undefined;
    }

    const intervalId = setInterval(() => {
      const player = youtubeRef.current;
      if (!player || typeof player.getPlayerState !== 'function') return;
      setIsYoutubePlaying(player.getPlayerState() === 1);
    }, 500);

    return () => clearInterval(intervalId);
  }, [youtubeId]);

  // Update scroll speed when tempo changes
  useEffect(() => {
    if (tempo) {
      setScrollSpeed(parseInt(tempo) || 120);
    }
  }, [tempo]);

  useEffect(() => {
    if (!autoStartMetronome || autoMetronomeStartedRef.current) return;
    setIsMetronomeActive(true);
    autoMetronomeStartedRef.current = true;
  }, [autoStartMetronome, setIsMetronomeActive]);

  useEffect(() => {
    if (!autoPlayVideo || autoVideoPlayStartedRef.current || !youtubeId) return;

    // Panel media kini selalu terbuka (tab), cukup mulai play video-nya.
    let attempts = 0;
    const maxAttempts = 20;
    const intervalId = setInterval(() => {
      attempts += 1;
      const canPlay =
        youtubeRef.current &&
        typeof youtubeRef.current.handlePlay === 'function';

      if (canPlay) {
        youtubeRef.current.handlePlay();
        autoVideoPlayStartedRef.current = true;
        clearInterval(intervalId);
        return;
      }

      if (attempts >= maxAttempts) {
        clearInterval(intervalId);
      }
    }, 200);

    return () => clearInterval(intervalId);
  }, [autoPlayVideo, youtubeId]);

  // (Efek autoscroll dipindah ke komponen AutoScrollBar)

  // Metronome effect now handled by useMetronome hook

  // ...existing code...

    // Analyze chords when lyrics change
  // ChordStats logic now handled by useChordStats hook

  // Fetch setlists that contain this song only when we actually need the global list.
  // In a setlist route, the current setlist context already provides the relevant data.
  useEffect(() => {
    if (!song?.id || setlistId) {
      return;
    }

    setLoadingSetlists(true);
    fetchSetLists()
      .then((data) => {
        setSetlists(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Gagal mengambil daftar setlist:', err);
        setSetlists([]);
      })
      .finally(() => {
        setLoadingSetlists(false);
      });
  }, [song?.id, setlistId]);

  // Setlist aktif belum terload (mis. buka link langsung ke lagu dalam setlist
  // di sesi baru): ambil setlist berdasarkan routeSetlistId supaya
  // setlistSongMeta (key/tempo/genre override) tetap bisa dipakai.
  // State directLinkedSetlist dideklarasikan di bagian Setlist Context di atas.
  useEffect(() => {
    if (!isSetlistRoute || !routeSetlistId || navSetlist) {
      return;
    }
    let cancelled = false;
    if (typeof fetchSetListById !== 'function') return undefined;
    fetchSetListById(routeSetlistId)
      .then((data) => {
        if (!cancelled && data) setDirectLinkedSetlist(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isSetlistRoute, routeSetlistId, navSetlist]);

  // Handler export & share di utils/songHandlers.js

  // Handle time marker updates
  const handleTimeMarkerUpdate = async (updatedMarkers) => {
    if (!song.id || !can(PERMISSIONS.SONG_EDIT)) return;

    try {
      const res = await fetch(`/api/songs/${song.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          ...song,
          time_markers: JSON.stringify(updatedMarkers),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal menyimpan time marker');
      }

      // Fetch fresh data
      const fetchRes = await fetch(`/api/songs/${song.id}`, {
        headers: getAuthHeader(),
      });

      if (!fetchRes.ok) {
        throw new Error('Gagal memuat data terbaru');
      }

      const updatedSong = await fetchRes.json();
      setFetchedSong(updatedSong);
    } catch (err) {
      console.error('Gagal memperbarui penanda waktu:', err);
    }
  };

  // Handler export & share di utils/songHandlers.js

  const handleBack = () => {
    if (setlistId) {
      navigate(`/setlists/${setlistId}`);
    } else {
      navigate('/songs');
    }
  };

  // Navigasi antar lagu di panel lirik.
  // - Dalam konteks setlist: urutan mengikuti daftar lagu setlist aktif.
  // - Di luar setlist: urutan mengikuti repertoir semua lagu (songsProp) supaya
  //   panel navigasi tetap ada, tanpa tombol setlist.
  const setlistNav = useMemo(() => {
    const songList = Array.isArray(navSetlist?.songs) && navSetlist.songs.length
      && typeof navSetlist.songs[0] === 'object'
      ? navSetlist.songs
      : null;
    const idList = !songList && Array.isArray(navSetlist?.songs) ? navSetlist.songs : null;
    const pool = Array.isArray(songsProp) ? songsProp : [];

    let orderedSongs = null;
    if (songList) {
      orderedSongs = songList;
    } else if (idList) {
      const byId = new Map(pool.map((s) => [String(s.id), s]));
      orderedSongs = idList.map((sid) => byId.get(String(sid))).filter(Boolean);
    } else {
      // Bukan dari setlist: pakai repertoir lagu sebagai urutan navigasi.
      orderedSongs = pool;
    }
    if (!orderedSongs || !orderedSongs.length) return null;

    const currentId = String(song?.id ?? '');
    const index = orderedSongs.findIndex((s) => String(s?.id) === currentId);
    if (index === -1) return null;

    const go = (nextIndex) => {
      const target = orderedSongs[nextIndex];
      if (!target) return;
      if (!navSetlist?.id) {
        navigate(`/songs/view/${target.id}`);
        return;
      }
      navigate(`/setlists/${navSetlist.id}/songs/${target.id}`, {
        state: {
          setlistId: navSetlist.id,
          setlist: navSetlist,
          setlistSong: target,
        },
      });
    };

    return {
      hasPrev: index > 0,
      hasNext: index < orderedSongs.length - 1,
      songNumber: index + 1,
      totalSongs: orderedSongs.length,
      prevTitle: orderedSongs[index - 1]?.title || '',
      nextTitle: orderedSongs[index + 1]?.title || '',
      setlistName: navSetlist?.name || '',
      onPrev: () => go(index - 1),
      onNext: () => go(index + 1),
      goToSong: (songId) => {
        const nextIndex = orderedSongs.findIndex((s) => String(s?.id) === String(songId));
        if (nextIndex !== -1) go(nextIndex);
      },
      // Buka lagu di luar setlist (dari pencarian cepat di footer).
      // Navigasi keluar konteks setlist — footer nav akan hilang otomatis.
      openSongOutside: (songId) => {
        if (!songId) return;
        navigate(`/songs/view/${songId}`);
      },
      // Kembali ke daftar lagu setlist aktif (tombol 📋 di footer + Up Next).
      // Hanya tersedia saat ada setlist; di luar setlist tombolnya tidak dirender.
      onOpenSetlist: navSetlist?.id ? () => navigate(`/setlists/${navSetlist.id}`) : undefined,
      // Daftar lagu untuk sheet pilih-lagu (footer): nomor, judul, key, aktif
      songs: orderedSongs.map((s, i) => ({
        id: String(s?.id),
        number: i + 1,
        title: s?.title || '',
        key: s?.key || s?.performanceKey || '',
        isCurrent: String(s?.id) === currentId,
      })),
    };
  }, [navSetlist, songsProp, song?.id, navigate]);

  // Show loading state — lazy load: skeleton, bukan halaman penuh yang berkedip
  if (loading) {
    return (
      <div className="page-container">
        <SongDetailSkeleton />
        <div className="song-tabs">
          <div className="lyrics-loading-skeleton">
            <div className="skeleton-line" style={{ width: '80%' }} />
            <div className="skeleton-line" style={{ width: '90%' }} />
            <div className="skeleton-line" style={{ width: '70%' }} />
            <div className="skeleton-line" style={{ width: '60%' }} />
            <div className="skeleton-line" style={{ width: '85%' }} />
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="page-container">
        <div className="not-found-container">
          <div className="not-found-icon">⚠️</div>
          <h2 className="not-found-title">Error</h2>
          <p className="not-found-message">{error}</p>
          <button
            onClick={handleBack}
            className="btn"
            aria-label="Kembali ke halaman sebelumnya"
          >
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="page-container">
        <div className="not-found-container">
          <div className="not-found-icon">🎵</div>
          <h2 className="not-found-title">Lagu Tidak Ditemukan</h2>
          <p className="not-found-message">Lagu yang Anda cari tidak tersedia</p>
          <button
            onClick={handleBack}
            className="btn"
            aria-label="Kembali ke halaman sebelumnya"
          >
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    navigate(`/songs/edit/${song.id}`);
  };

  // Hapus lagu: hanya owner (userId cocok) atau user dengan permission edit
  // lagu band yang boleh. Konfirmasi dulu, lalu kembali ke daftar asal.
  const isSongOwner = Boolean(song?.userId) && String(song.userId) === String(currentUserId);
  const canDeleteSong = isSongOwner || can(PERMISSIONS.SONG_EDIT);

  const handleDelete = async () => {
    if (!song?.id || deletingSong) return;
    const confirmed = window.confirm(
      `Hapus lagu "${song.title || 'tanpa judul'}"? Tindakan ini tidak bisa dibatalkan.`
    );
    if (!confirmed) return;

    try {
      setDeletingSong(true);
      await deleteSong(song.id);
      navigate(setlistId ? `/setlists/${setlistId}` : '/songs');
    } catch (err) {
      console.error('Gagal menghapus lagu:', err);
      window.alert(err?.message || 'Gagal menghapus lagu');
    } finally {
      setDeletingSong(false);
    }
  };

  const handleToggleMastery = async (level = null) => {
    if (!song?.id || !song?.canMarkMastery || updatingMastery) return;

    // Tiga status tersimpan di database: 'mastered' (Dikuasai), 'learning'
    // (Perlu Latihan), 'none' (Belum Diulik). Klik level aktif kembali ke 'none'.
    const currentStatus = song.currentUserStatus
      || (song.isMasteredByCurrentUser ? 'mastered' : 'none');
    const targetStatus = level === null
      ? (currentStatus === 'none' ? 'mastered' : 'none')
      : (level === currentStatus ? 'none' : level);
    if (targetStatus === currentStatus) return;
    try {
      setUpdatingMastery(true);
      const payload = await updateSongMastery(song.id, targetStatus);
      setFetchedSong((prev) => ({
        ...(prev || song),
        masteredBy: Array.isArray(payload.masteredBy) ? payload.masteredBy : [],
        isMasteredByCurrentUser: Boolean(payload.isMasteredByCurrentUser),
        currentUserStatus: payload.currentUserStatus || 'none',
      }));
    } catch (err) {
      console.error('Gagal memperbarui status penguasaan lagu:', err);
    } finally {
      setUpdatingMastery(false);
    }
  };

  // Panel media: konfigurasi SongMediaPanel untuk tab Media. Layout 2 kolom
  // murni CSS container query (.smp-layout); state playback & marker tetap
  // satu sumber di halaman ini.
  const canEditSong = can(PERMISSIONS.SONG_EDIT);
  const mediaPanelProps = {
    variant: 'card',
    youtubeId,
    youtubeRef,
    timeMarkers,
    isPlaying: isYoutubePlaying,
    onTogglePlay: () => {
      youtubeRef.current?.handleTogglePlayPause?.();
      // State diselaraskan oleh poll interval di atas dalam ≤500ms.
    },
    onSeek: (time) => youtubeRef.current?.handleSeek?.(time),
    onUpdateMarkers: canEditSong ? handleTimeMarkerUpdate : undefined,
    currentTime: ytCurrentTime,
    duration: ytDuration,
    getCurrentYouTubeTime: () =>
      typeof youtubeRef.current?.currentTime === 'number' ? youtubeRef.current.currentTime : 0,
    onTimeUpdate: (t, d) => {
      if (typeof t === 'number' && Number.isFinite(t)) setYtCurrentTime(t);
      if (typeof d === 'number' && Number.isFinite(d)) setYtDuration(d);
    },
  };

  return (
    <div className="page-container">
      {/* Song header (judul, artis, aksi) — di atas tab, di semua lebar layar. */}
      <SongChordsInfo
        originalKey={song?.key || key || ''}
        targetKey={key || song?.key || ''}
        lyricsOriginalKey={lyricsMetaKey}
        transpose={transpose}
        setTranspose={setTranspose}
        timeSignature={timeSignature}
        tempo={tempo}
        scrollSpeed={scrollSpeed}
        setScrollSpeed={setScrollSpeed}
        isMetronomeActive={isMetronomeActive}
        setIsMetronomeActive={setIsMetronomeActive}
        genre={genre}
        keyboardPatch={keyboardPatch}
        detectedInstruments={detectedInstruments}
        title={song.title}
        artist={artist}
        contributor={song.contributor}
        canEdit={can(PERMISSIONS.SONG_EDIT)}
        canDelete={canDeleteSong}
        deleting={deletingSong}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onShare={() => handleShare(song, artist, setShareMessage)}
        shareMessage={shareMessage}
        masteredBy={song.masteredBy}
        canMarkMastery={song.canMarkMastery}
        isMasteredByCurrentUser={song.isMasteredByCurrentUser}
        currentUserStatus={song.currentUserStatus || (song.isMasteredByCurrentUser ? 'mastered' : 'none')}
        onToggleMastery={handleToggleMastery}
        masteryUpdating={updatingMastery}
        pianoRecommendation={pianoRecommendation}
        onApplyRecommendedTranspose={(relativeSteps) => setTranspose((prev) => prev + relativeSteps)}
        showExportMenu={showExportMenu}
        setShowExportMenu={setShowExportMenu}
        handleExportText={() => handleExportText(song, artist, key, lyricsMetaKey, tempo, lyricsForExport, transpose, setShowExportMenu)}
        handleExportPDF={() => handleExportPDF(song, artist, key, lyricsMetaKey, tempo, lyricsForExport, transpose, setShowExportMenu)}
      />

      {/* Lirik (kiri) berbagi kolom dengan tab panel (kanan) di desktop:
          Media | Analisis | Setlist. Mobile: bertumpuk. */}
      <div className="song-lyrics-tabs-grid">
        <SongLyricsMainSection
          lyricsDisplayRef={lyricsDisplayRef}
          tempo={tempo}
          autoScrollActive={autoScrollActive}
          setAutoScrollActive={setAutoScrollActive}
          scrollSpeed={scrollSpeed}
          setScrollSpeed={setScrollSpeed}
          autoScrollMode={autoScrollMode}
          setAutoScrollMode={setAutoScrollMode}
          manualSpeedLevel={manualSpeedLevel}
          setManualSpeedLevel={setManualSpeedLevel}
          zoom={zoom}
          setZoom={setZoom}
          song={song}
          transpose={transpose}
          setTranspose={setTranspose}
          showSheetMusic={showSheetMusic}
          setShowSheetMusic={setShowSheetMusic}
          youtubeRef={youtubeRef}
          youtubeId={youtubeId}
          isYoutubePlaying={isYoutubePlaying}
          loading={loading}
          showChordNumbers={showChordNumbers}
          setShowChordNumbers={setShowChordNumbers}
          showJazzChords={showJazzChords}
          setShowJazzChords={setShowJazzChords}
          showSimpleChords={showSimpleChords}
          setShowSimpleChords={setShowSimpleChords}
          keySignature={key || song?.key || ''}
          originalKey={song?.key || baseKey || ''}
          targetKey={key || song?.key || ''}
          onKeyChange={handleSongKeyChange}
          pianoRecommendation={pianoRecommendation}
          onApplyRecommendedTranspose={(relativeSteps) => setTranspose((prev) => prev + relativeSteps)}
          setlistNav={setlistNav}
        />

        <div className="song-tabs song-tabs-side">
          <div className="song-tabs-bar" role="tablist" aria-label="Panel lagu">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'media'}
              className={`song-tabs-tab${activeTab === 'media' ? ' active' : ''}`}
              onClick={() => setActiveTab('media')}
              disabled={!youtubeId}
              title={youtubeId ? 'Video referensi & time marker' : 'Lagu ini belum punya video YouTube'}
            >
              ▶️ Video
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'analyzer'}
              className={`song-tabs-tab${activeTab === 'analyzer' ? ' active' : ''}`}
              onClick={() => setActiveTab('analyzer')}
            >
              🔎 Chord
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'setlists'}
              className={`song-tabs-tab${activeTab === 'setlists' ? ' active' : ''}`}
              onClick={() => setActiveTab('setlists')}
            >
              📋 Dalam Setlist
            </button>
          </div>

          {/* Tab video: panel video + time marker, berbagi kolom dengan panel lirik. */}
          {activeTab === 'media' && youtubeId && (
            <SongMediaPanel {...mediaPanelProps} />
          )}

          {activeTab === 'analyzer' && (
            <SongChordsAnalyzer
              chordStats={chordStats}
              transpose={transpose}
              song={song}
              songSections={extractSectionOverview(song?.lyrics || '')}
            />
          )}

          {/* Setlist yang memuat lagu ini — tab Setlist. */}
          {activeTab === 'setlists' && song.id && !loadingSetlists && (() => {
            const containingSetlists = setlists.filter((sl) =>
              Array.isArray(sl.songs) && sl.songs.includes(song.id)
            );
            if (containingSetlists.length === 0) {
              return <div className="empty-state">Lagu ini belum ada di setlist mana pun</div>;
            }
            return (
              <div className="song-panel song-containing-setlists expanded">
                <div className="song-containing-setlists-header">
                  <span className="song-containing-setlists-title">📋 Setlist yang Memuat Lagu Ini ({containingSetlists.length})</span>
                </div>
                <div className="song-containing-setlists-list">
                  {containingSetlists.map((sl) => (
                    <button
                      key={sl.id}
                      type="button"
                      className="song-containing-setlist-item"
                      onClick={() => navigate(`/setlists/${sl.id}`)}
                      title={sl.name}
                    >
                      <span className="song-containing-setlist-name">{sl.name}</span>
                      <span className="song-containing-setlist-count">{sl.songs?.length || 0} lagu</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Footer navigasi lagu: sticky di mobile; di desktop tampil sebagai bar
          inline. Di luar setlist navigasi memakai urutan repertoir dan tombol
          setlist (📋) tidak dirender. */}
      <SetlistNavFooter
        setlistNav={setlistNav}
        allSongs={Array.isArray(songsProp) ? songsProp : []}
        variant="inline"
      />
    </div>
  );
}
