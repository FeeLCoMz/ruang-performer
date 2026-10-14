import React, { useState, useEffect, useRef, useMemo } from 'react';
import SongChordsAnalyzer from '../components/SongChordsAnalyzer.jsx';
import SongLyricsMainSection from '../components/SongLyricsMainSection.jsx';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import PerformanceDock from '../components/PerformanceDock.jsx';
import SongChordsMediaPanel from '../components/SongChordsMediaPanel.jsx';
import SongChordsInfo from '../components/SongChordsInfo.jsx';
import { getAuthHeader } from '../utils/auth.js';import { useAuth } from '../contexts/AuthContext.jsx';
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS } from '../utils/permissionUtils.js';
import { useSongFetch } from '../hooks/useSongFetch.js';
import { handleExportText, handleExportPDF, handleShare } from '../utils/songHandlers.js';
import useMetronome from '../hooks/useMetronome.js';
import useChordStats from '../hooks/useChordStats.js';
import { fetchSetLists, updateSongMastery } from '../apiClient.js';
import { recommendPianoFriendlyKey, extractDetectedInstrumentsFromLyrics, transposeChord } from '../utils/chordUtils.js';

/**
 * SongChordsPage
 * Halaman utama untuk menampilkan lirik, chord, dan kontrol lagu.
 * Mendukung konteks setlist, navigasi antar lagu, transpose, autoscroll, dan fitur media.
 *
 * Props:
 *   - song: (optional) data lagu yang diterima dari parent
 */
export default function SongChordsPage({ song: songProp, activeSetlist = null, songs: songsProp = [], performanceMode: performanceModeProp = false }) {
  // State untuk toggle tampilan partitur
  const [showSheetMusic, setShowSheetMusic] = useState(false);
  // =========================
  // 1. Routing & Context
  // =========================
  const navigate = useNavigate();
  const location = useLocation();
  const { id: songId, setlistId: routeSetlistId } = useParams();
  const { user } = useAuth();

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
  // Metadata lagu dalam setlist (jika ada)
  const isSetlistRoute = typeof location?.pathname === 'string' && location.pathname.startsWith('/setlists/');
  const setlistSongData = isSetlistRoute ? (location.state?.setlistSong || {}) : {};
  const setlistData = isSetlistRoute ? (location.state?.setlist || activeSetlist || {}) : {};
  const setlistId = isSetlistRoute ? (location.state?.setlistId || activeSetlist?.id || routeSetlistId || null) : null;
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
  const key = setlistSongData.key || song?.key || '';
  const tempo = setlistSongData.tempo || song?.tempo || '';
  const genre = setlistSongData.genre || song?.genre || '';
  const keyboardPatch = setlistSongData.keyboardPatch || song?.keyboardPatch || song?.keyboard_patch || '';
  const timeSignature = setlistSongData.time_signature || song?.time_signature || '4/4';
  const youtubeId = song?.youtubeId || song?.youtube_url || '';
  const timeMarkers = song?.time_markers || [];

  // Mode performance dikendalikan dari app header (prop dari App), jadi bisa
  // di-switch kapan saja — termasuk untuk lagu di luar setlist.
  const performanceMode = Boolean(performanceModeProp);

  // Transpose & tempo & metronom — dideklarasikan SEBELUM efek yang memakainya.
  const [transpose, setTranspose] = useState(0);
  // Tempo yang bisa diatur dari bottom nav performance (tanpa mengubah data lagu).
  const [tempoState, setTempoState] = useState(() => Number(tempo) || 120);
  useEffect(() => {
    setTempoState(Number(tempo) || 120);
  }, [tempo, song?.id]);

  const [isMetronomeActive, setIsMetronomeActive] = useMetronome(false, tempoState);

  useEffect(() => {
    setTranspose(0);
  }, [song?.id]);

  // Saat mode performance aktif, app header menampilkan judul & penyanyi
  // lagu aktif (bukan branding) — App mendengarkan event ini.
  useEffect(() => {
    if (!performanceMode) return undefined;
    window.dispatchEvent(new CustomEvent('performance-song-change', {
      detail: { title: song?.title || '', artist: artist || '' },
    }));
    return undefined;
  }, [performanceMode, song?.id, song?.title, artist]);

  // Laporkan key & tempo aktif ke bottom nav performance.
  const performanceKey = useMemo(() => {
    const base = key || song?.key || '';
    if (!base || !transpose) return base;
    try {
      return transposeChord(base, transpose) || base;
    } catch {
      return base;
    }
  }, [key, song?.key, transpose]);

  useEffect(() => {
    if (!performanceMode) return undefined;
    window.dispatchEvent(new CustomEvent('performance-state', {
      detail: { key: performanceKey || '-', tempo: tempoState || '-', metronomeActive: isMetronomeActive },
    }));
    return undefined;
  }, [performanceMode, performanceKey, tempoState, isMetronomeActive]);
  // Kontrol dari bottom nav performance: transpose (♭/♯/reset), tempo (metronom),
  // dan autoscroll. Dikirim sebagai event karena nav berada di luar halaman,
  // sedangkan state kontrol ini dimiliki halaman lagu.
  useEffect(() => {
    if (!performanceMode) return undefined;
    const handler = (e) => {
      const { action, delta } = e?.detail || {};
      switch (action) {
        case 'transpose':
          setTranspose((prev) => Math.max(-11, Math.min(11, (prev || 0) + (Number(delta) || 0))));
          break;
        case 'transpose-reset':
          setTranspose(0);
          break;
        case 'song-prev':
        case 'song-next': {
          // Pindah lagu sesuai urutan setlist aktif.
          const arr = Array.isArray(setlistData?.songs) ? setlistData.songs : [];
          const idx = arr.findIndex((s) => String(s.id || s._id) === String(song.id));
          if (idx < 0) break;
          const targetIdx = action === 'song-prev' ? idx - 1 : idx + 1;
          const target = arr[targetIdx];
          if (target) {
            const targetSong = (Array.isArray(songsProp) ? songsProp : []).find((s) => String(s.id) === String(target.id || target._id)) || target;
            navigate(`/setlists/${setlistId}/songs/${target.id || target._id}`, {
              state: { setlistId, setlist: setlistData, setlistSong: targetSong },
            });
          }
          break;
        }
        case 'song-list': {
          // Buka daftar lagu setlist (PerformanceDock panel) — cukup navigate
          // kembali ke halaman setlist dengan fokus lagu aktif.
          if (setlistId) {
            navigate(`/setlists/${setlistId}`, {
              state: { setlistId, setlist: setlistData, focusSongId: song.id },
            });
          }
          break;
        }
        case 'tempo':
          setTempoState((prev) => Math.max(40, Math.min(240, (Number(prev) || Number(tempo) || 120) + (Number(delta) || 0))));
          break;
        case 'metronome-toggle':
          setIsMetronomeActive((prev) => !prev);
          break;
        case 'autoscroll-toggle':
          setAutoScrollActive((prev) => !prev);
          break;
        case 'autoscroll-speed':
          setScrollSpeed((prev) => Math.max(40, Math.min(240, (Number(prev) || 120) + (Number(delta) || 0))));
          break;
        default:
          break;
      }
    };
    window.addEventListener('performance-action', handler);
    return () => window.removeEventListener('performance-action', handler);
  }, [performanceMode, tempo, setlistData, setlistId, song?.id, songsProp, navigate]);

  const [zoom, setZoom] = useState(1);
  const [showChords] = useState(true);
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


  // Media panel collapse state (default: collapsed)
  const [activeTab, setActiveTab] = useState('info');

  const youtubeRef = useRef(null);
  const autoMetronomeStartedRef = useRef(false);
  const autoVideoPlayStartedRef = useRef(false);

  // AudioContext logic now handled by useMetronome

  // Auto Scroll state
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(parseInt(tempo) || 120);
  const lyricsDisplayRef = useRef(null);

  // Real playback state for the timestamp play buttons. Without this the button
  // could only ever seek: ChordDisplay used to guess locally, and once that was
  // removed it received no state at all, so it never showed "pause".
  const [isYoutubePlaying, setIsYoutubePlaying] = useState(false);

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

  // Show loading state
  if (loading) {
    return (
      <div className="page-container">
        <div className="not-found-container">
          <div className="not-found-icon">⏳</div>
          <h2 className="not-found-title">Memuat Lagu...</h2>
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

  const handleToggleMastery = async (level = null) => {
    if (!song?.id || !song?.canMarkMastery || updatingMastery) return;

    // Level target: 'none' | 'learning' | 'ready'. API saat ini hanya
    // mendukung boolean mastered; 'learning' dipetakan ke belum-kuasai.
    // Ganti ke endpoint bertahap bila backend menambah dukungan level.
    const targetMastered = level === null ? !song.isMasteredByCurrentUser : (level === 'ready');
    if (targetMastered === Boolean(song.isMasteredByCurrentUser)) return;
    try {
      setUpdatingMastery(true);
      const payload = await updateSongMastery(song.id, targetMastered);
      setFetchedSong((prev) => ({
        ...(prev || song),
        masteredBy: Array.isArray(payload.masteredBy) ? payload.masteredBy : [],
        isMasteredByCurrentUser: Boolean(payload.isMasteredByCurrentUser),
      }));
    } catch (err) {
      console.error('Gagal memperbarui status penguasaan lagu:', err);
    } finally {
      setUpdatingMastery(false);
    }
  };

  return (
    <div className={`page-container${performanceMode ? ' setlist-performance-mode song-chords-performance-mode' : ''}`}>
      {performanceMode && (
        /* Mode performance: song info tetap di luar tab (key/tempo saja) */
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
          performanceKeyOverride={setlistSongData.key || ''}
          performanceMode={performanceMode}
          canEdit={can(PERMISSIONS.SONG_EDIT)}
          onEdit={handleEdit}
          onShare={() => handleShare(song, artist, setShareMessage)}
          shareMessage={shareMessage}
          masteredBy={song.masteredBy}
          canMarkMastery={song.canMarkMastery}
          isMasteredByCurrentUser={song.isMasteredByCurrentUser}
          onToggleMastery={handleToggleMastery}
          masteryUpdating={updatingMastery}
          pianoRecommendation={pianoRecommendation}
          onApplyRecommendedTranspose={(relativeSteps) => setTranspose((prev) => prev + relativeSteps)}
          showExportMenu={showExportMenu}
          setShowExportMenu={setShowExportMenu}
          handleExportText={() => handleExportText(song, artist, key, lyricsMetaKey, tempo, lyricsForExport, transpose, setShowExportMenu)}
          handleExportPDF={() => handleExportPDF(song, artist, key, lyricsMetaKey, tempo, lyricsForExport, transpose, setShowExportMenu)}
        />
      )}

      {/* Tab panel: Info | Media | Lirik — mode normal */}
      {!performanceMode && (
        <div className="song-tabs">
          <div className="song-tabs-bar" role="tablist" aria-label="Panel lagu">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'info'}
              className={`song-tabs-tab${activeTab === 'info' ? ' active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              ℹ️ Info
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'media'}
              className={`song-tabs-tab${activeTab === 'media' ? ' active' : ''}`}
              onClick={() => setActiveTab('media')}
              disabled={!youtubeId}
              title={youtubeId ? 'Panel media (video & time markers)' : 'Lagu ini belum punya video YouTube'}
            >
              📺 Media
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'lyrics'}
              className={`song-tabs-tab${activeTab === 'lyrics' ? ' active' : ''}`}
              onClick={() => setActiveTab('lyrics')}
            >
              🎤 Lirik
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'analyzer'}
              className={`song-tabs-tab${activeTab === 'analyzer' ? ' active' : ''}`}
              onClick={() => setActiveTab('analyzer')}
            >
              🎵 Analisis
            </button>
          </div>

          {activeTab === 'info' && (
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
              performanceKeyOverride={setlistSongData.key || ''}
              performanceMode={false}
              canEdit={can(PERMISSIONS.SONG_EDIT)}
              onEdit={handleEdit}
              onShare={() => handleShare(song, artist, setShareMessage)}
              shareMessage={shareMessage}
              masteredBy={song.masteredBy}
              canMarkMastery={song.canMarkMastery}
              isMasteredByCurrentUser={song.isMasteredByCurrentUser}
              onToggleMastery={handleToggleMastery}
              masteryUpdating={updatingMastery}
              pianoRecommendation={pianoRecommendation}
              onApplyRecommendedTranspose={(relativeSteps) => setTranspose((prev) => prev + relativeSteps)}
              showExportMenu={showExportMenu}
              setShowExportMenu={setShowExportMenu}
              handleExportText={() => handleExportText(song, artist, key, lyricsMetaKey, tempo, lyricsForExport, transpose, setShowExportMenu)}
              handleExportPDF={() => handleExportPDF(song, artist, key, lyricsMetaKey, tempo, lyricsForExport, transpose, setShowExportMenu)}
            />
          )}

          {/* Setlist yang memuat lagu ini — selalu terbuka, hanya di tab Info */}
          {activeTab === 'info' && song.id && !loadingSetlists && setlists.length > 0 && (() => {
            const containingSetlists = setlists.filter((sl) =>
              Array.isArray(sl.songs) && sl.songs.includes(song.id)
            );
            if (containingSetlists.length === 0) return null;
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

          {activeTab === 'media' && youtubeId && (
            <SongChordsMediaPanel
              youtubeId={youtubeId}
              youtubeRef={youtubeRef}
              timeMarkers={timeMarkers}
              canEdit={can(PERMISSIONS.SONG_EDIT)}
              handleTimeMarkerUpdate={handleTimeMarkerUpdate}
            />
          )}

          {activeTab === 'analyzer' && (
            <SongChordsAnalyzer
              chordStats={chordStats}
              transpose={transpose}
              songKey={song?.key || key}
              song={song}
            />
          )}
        </div>
      )}

      {/* Lirik & chord — mode normal: hanya di tab Lirik. Mode performance: selalu. */}
      {(performanceMode || activeTab === 'lyrics') && (
        <SongLyricsMainSection
        lyricsDisplayRef={lyricsDisplayRef}
        tempo={tempo}
        timeSignature={timeSignature}
        autoScrollActive={autoScrollActive}
        scrollSpeed={scrollSpeed}
        setAutoScrollActive={setAutoScrollActive}
        setScrollSpeed={setScrollSpeed}
        zoom={zoom}
        setZoom={setZoom}
        song={song}
        transpose={transpose}
        setTranspose={setTranspose}
        showChords={showChords}
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
        performanceMode={performanceMode}
        originalKey={song?.key || key || ''}
        targetKey={key || song?.key || ''}
        pianoRecommendation={pianoRecommendation}
        onApplyRecommendedTranspose={(relativeSteps) => setTranspose((prev) => prev + relativeSteps)}
        />
      )}

      {/* Dock performance (hanya mode performance, dalam konteks setlist) */}
      {setlistId && performanceMode && (() => {
        const dockSongs = Array.isArray(songsProp) && songsProp.length > 0
          ? songsProp
          : (Array.isArray(setlistData?.songs) ? setlistData.songs : []);
        return (
          <PerformanceDock
            setlist={setlistData}
            songs={dockSongs}
            currentSongId={song.id}
          />
        );
      })()}

    </div>
  );
}
