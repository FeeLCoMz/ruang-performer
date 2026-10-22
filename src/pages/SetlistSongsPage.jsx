import React from 'react';
import SetlistPoster from '../components/SetlistPoster.jsx';
import SongCard from '../components/SongCard.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo } from 'react';
// html2canvas & jspdf dimuat secara lazy di dalam handler (dynamic import)
// agar tidak memberatkan bundle awal di perangkat mobile.

import * as authUtils from '../utils/auth.js';
import { cacheSetlist, getSetlist as getSetlistOffline } from '../utils/offlineCache.js';
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS, canEditSetlist } from '../utils/permissionUtils.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import * as chordUtils from '../utils/chordUtils.js';
import { buildSmartSetlistPlan } from '../utils/setlistSmartAssistant.js';
import { inferSongMood } from '../utils/songMoodUtils.js';
import { SongListSkeleton } from '../components/LoadingSkeleton.jsx';
import useMetronome from '../modules/metronome/useMetronome.js';
import { updateSongMastery } from '../apiClient.js';
import { STORAGE_KEYS } from '../utils/storageKeys.js';
import MasteryChip from '../components/MasteryChip.jsx';
import SongMediaPanel from '../components/SongMediaPanel.jsx';

const SESSION_DIVIDER_META_FIELD = 'sessionDividerName';

// userBandInfo: bisa array (multi-band) atau object (single band)
export default function SetlistSongsPage({ setlists, songs, setSetlists, setActiveSetlist, loadingSetlists, userBandInfo }) {
  const { id: setlistId } = useParams();
  const navigate = useNavigate();
  const isLoading = typeof loadingSetlists === 'boolean' ? loadingSetlists : !Array.isArray(setlists);
  let setlist = Array.isArray(setlists) ? setlists.find(s => String(s.id) === String(setlistId)) : null;
  // Permission logic
  const bandId = setlist?.bandId || null;
  // Mendukung userBandInfo array (multi-band) atau object (single band), konsisten bandId/id
  let currentUserBandInfo = null;
  if (Array.isArray(userBandInfo) && bandId) {
    currentUserBandInfo = userBandInfo.find(b => String(b.bandId || b.id) === String(bandId));
  } else if (userBandInfo && bandId && (userBandInfo.bandId || userBandInfo.id) && String(userBandInfo.bandId || userBandInfo.id) === String(bandId)) {
    currentUserBandInfo = userBandInfo;
  } else if (!bandId) {
    // Setlist pribadi, role owner, bandId null agar konsisten
    currentUserBandInfo = { role: 'owner', bandId: null };
  }
  const { user: userFromAuth } = useAuth();
  const { user, can } = usePermission(bandId, currentUserBandInfo);
  // For personal setlist, fallback to userFromAuth if user is undefined
  const effectiveUser = user || userFromAuth;
  // Permission logic DRY: helper
  const canEdit = canEditSetlist(setlist, userBandInfo, effectiveUser);

  // Jika setlist tidak ditemukan (misal offline), coba ambil dari cache offline
  const [offlineSetlist, setOfflineSetlist] = useState(null);
  useEffect(() => {
    if (!setlist && setlistId) {
      getSetlistOffline(setlistId).then((cached) => {
        if (cached) setOfflineSetlist(cached);
      });
    } else if (setlist) {
      // Simpan ke cache jika ditemukan
      cacheSetlist(setlist).catch(() => {});
      setOfflineSetlist(null);
    }
  }, [setlist, setlistId]);
  if (!setlist && offlineSetlist) setlist = offlineSetlist;

  // Set setlist aktif saat halaman dibuka
  useEffect(() => {
    if (setActiveSetlist && setlist) setActiveSetlist(setlist);
  }, [setlistId, setlists]);

  // State untuk order lagu di setlist
  const [localOrder, setLocalOrder] = useState([]);
  useEffect(() => {
    if (setlist && Array.isArray(setlist.songs)) {
      setLocalOrder([...(setlist.songs || [])]);
    }
  }, [setlist?.id, setlist?.songs]);

  // State untuk filter dan search
  const [searchText, setSearchText] = useState('');
  const [filterSmartOnly, setFilterSmartOnly] = useState(false);
  // The old "Kelompokkan" dropdown became this single switch. Grouping split the
  // list into sections that no longer matched the running order. Preferensinya
  // dipersist di localStorage supaya pilihan tidak hilang saat halaman dibuka ulang.
  const [hideCompletedSongs, setHideCompletedSongsState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.SETLIST_HIDE_COMPLETED_SONGS) === '1';
    } catch {
      return false;
    }
  });
  const setHideCompletedSongs = (next) => {
    const value = Boolean(next);
    setHideCompletedSongsState(value);
    try {
      localStorage.setItem(STORAGE_KEYS.SETLIST_HIDE_COMPLETED_SONGS, value ? '1' : '0');
    } catch { /* ignore */ }
  };

  // State untuk modal tambah lagu (multi-select)
  const [showAddSong, setShowAddSong] = useState(false);
  const [addSongSearch, setAddSongSearch] = useState('');
  const [addSongError, setAddSongError] = useState('');
  const [addingSongIds, setAddingSongIds] = useState([]); // array of selected song ids
  const [isAddingSongs, setIsAddingSongs] = useState(false);
  const [isQuickAddingSong, setIsQuickAddingSong] = useState(false);
  const [quickCreatedSongs, setQuickCreatedSongs] = useState([]);
  const addSongInputRef = useRef(null);

  // State untuk merge dari setlist lain
  const [showMergeSetlistModal, setShowMergeSetlistModal] = useState(false);
  const [mergeSetlistSearch, setMergeSetlistSearch] = useState('');
  const [mergeSourceSetlistIds, setMergeSourceSetlistIds] = useState([]);
  const [mergeSetlistError, setMergeSetlistError] = useState('');
  const [isMergingSetlist, setIsMergingSetlist] = useState(false);

  // State untuk divider sesi
  const [showSessionDividerModal, setShowSessionDividerModal] = useState(false);
  const [sessionDividerName, setSessionDividerName] = useState('');
  const [sessionDividerSongId, setSessionDividerSongId] = useState('');
  const [sessionDividerError, setSessionDividerError] = useState('');
  const [editingSessionDividerSongId, setEditingSessionDividerSongId] = useState('');
  const [isSavingSessionDivider, setIsSavingSessionDivider] = useState(false);

  // State untuk share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareFormat, setShareFormat] = useState('full');
  const [shareSessionFilter, setShareSessionFilter] = useState('all');
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [posterError, setPosterError] = useState('');
  const posterRef = useRef(null);

  // State untuk copy modal
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyName, setCopyName] = useState('');
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState('');

  // State Smart Setlist Assistant
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [smartTargetMinutes, setSmartTargetMinutes] = useState('');
  const [smartStrategy, setSmartStrategy] = useState('balanced');
  const [smartError, setSmartError] = useState('');
  const [smartApplying, setSmartApplying] = useState(false);

  // State untuk edit lagu
  const [editSongId, setEditSongId] = useState(null);
  const [editSongKey, setEditSongKey] = useState('');
  const [editSongTempo, setEditSongTempo] = useState('');
  const [editSongStyle, setEditSongStyle] = useState('');
  const [editSongKeyError, setEditSongKeyError] = useState('');
  const [orderError, setOrderError] = useState('');

  // State untuk konfirmasi hapus
  const [confirmDeleteSongId, setConfirmDeleteSongId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [metronomeTempo, setMetronomeTempo] = useState(120);
  const [metronomeSongId, setMetronomeSongId] = useState(null);
  const [isMetronomeActive, setIsMetronomeActive] = useMetronome(false, metronomeTempo);
  const [activeVideoSong, setActiveVideoSong] = useState(null);
  const [isSequentialVideoMode, setIsSequentialVideoMode] = useState(false);
  // Playback position of the inline player, so the song's time markers can show
  // where you are and offer a jump to each section.
  const [videoPlayback, setVideoPlayback] = useState({ time: 0, duration: 0 });
  const videoRef = useRef(null);
  const activeInlinePlayerRef = useRef(null);

  // Override mastery lokal per lagu (chip di kartu setlist) + id yang sedang
  // disimpan, agar tidak perlu refetch seluruh lagu setelah ubah status.
  const [masteryOverrides, setMasteryOverrides] = useState({});
  const [masteryUpdatingId, setMasteryUpdatingId] = useState(null);
  const [masteryError, setMasteryError] = useState('');
  const handleMasteryChange = async (song, nextStatus) => {
    const currentUserId = String(effectiveUser?.userId || effectiveUser?.id || '');
    if (!currentUserId) {
      setMasteryError('Masuk untuk menandai status penguasaan lagu.');
      return;
    }
    setMasteryUpdatingId(song.id);
    setMasteryError('');
    try {
      await updateSongMastery(song.id, nextStatus);
      setMasteryOverrides((prev) => ({
        ...prev,
        [String(song.id)]: { status: nextStatus },
      }));
    } catch (err) {
      setMasteryError(err?.message || 'Gagal memperbarui status penguasaan lagu');
    } finally {
      setMasteryUpdatingId(null);
    }
  };

  const baseSongMap = useMemo(() => {
    const map = new Map();
    songs.forEach(song => {
      map.set(song.id, song);
    });
    quickCreatedSongs.forEach(song => {
      if (!map.has(song.id)) {
        map.set(song.id, song);
      }
    });
    return map;
  }, [songs, quickCreatedSongs]);

  const availableSongsPool = useMemo(() => {
    return Array.from(baseSongMap.values());
  }, [baseSongMap]);

  const canQuickCreateSong = useMemo(() => {
    if (!canEdit) return false;
    if (!bandId) return Boolean(effectiveUser);
    return can(PERMISSIONS.SONG_CREATE);
  }, [canEdit, bandId, effectiveUser, can]);

  const quickAddTitleCandidate = useMemo(() => addSongSearch.trim(), [addSongSearch]);

  const canShowQuickAddSong = useMemo(() => {
    if (!canQuickCreateSong) return false;
    if (!quickAddTitleCandidate) return false;
    return !availableSongsPool.some((song) =>
      (song.title || '').toLowerCase() === quickAddTitleCandidate.toLowerCase()
    );
  }, [canQuickCreateSong, quickAddTitleCandidate, availableSongsPool]);

  const songUsageCountMap = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(setlists)) return map;

    setlists.forEach((item) => {
      if (!Array.isArray(item?.songs)) return;
      const uniqueSongIds = new Set(item.songs);
      uniqueSongIds.forEach((songId) => {
        map.set(songId, (map.get(songId) || 0) + 1);
      });
    });

    return map;
  }, [setlists]);

  // Get songs dalam setlist sesuai localOrder + apply metadata override (mapping)
  const setlistSongMeta = typeof setlist?.setlistSongMeta === 'object' && !Array.isArray(setlist.setlistSongMeta) ? setlist.setlistSongMeta : {};
  const completedSongs = typeof setlist?.completedSongs === 'object' && !Array.isArray(setlist.completedSongs) ? setlist.completedSongs : {};
  const completedCount = (localOrder || []).filter((songId) => completedSongs[songId] === true).length;
  const uncompletedSongIds = (localOrder || []).filter((songId) => completedSongs[songId] !== true);
  const uncompletedCount = uncompletedSongIds.length;
  // Songs always follow the user's own order (localOrder). The sort dropdown was
  // removed: the order you arrange is the order you perform, and offering other
  // sorts made the list disagree with the stage.
  // Saat refresh, array `songs` global belum tentu terload — tanpa guard ini
  // semua lagu setlist sempat ditandai "[Lagu dihapus]" padahal hanya belum
  // ter-fetch. "Dihapus" hanya benar bila daftar lagu global sudah terload.
  const songsLoaded = Array.isArray(songs) && songs.length > 0;
  const setlistSongs = (localOrder || []).map((id) => {
    const song = availableSongsPool.find((item) => item.id === id);
    const meta = setlistSongMeta[id];
    if (song) {
      if (meta) {
        return {
          ...song,
          key: meta.key || song.key,
          tempo: meta.tempo || song.tempo,
          genre: meta.genre || song.genre,
        };
      }
      return song;
    }
    if (!songsLoaded) {
      // Belum terload — placeholder tanpa klaim "dihapus"
      return {
        id,
        title: 'Memuat…',
        artist: '',
        key: '',
        tempo: '',
        genre: '',
        loadingPlaceholder: true,
      };
    }
    // The song was deleted from the database.
    return {
      id,
      title: '[Lagu dihapus]',
      artist: '',
      key: '',
      tempo: '',
      genre: '',
      deleted: true,
    };
  });

  const sequentialVideoQueue = useMemo(
    () => (setlistSongs || []).filter((song) => hasYouTubeVideo(song)),
    [setlistSongs]
  );
  const hasSequentialVideoSet = sequentialVideoQueue.length > 0;

  // Filter lagu. Order is always the user's own (localOrder), so there is no
  // sorting step here at all.
  const filteredSongs = useMemo(() => {
    return setlistSongs.filter((song) => {
      const matchSearch =
        !searchText ||
        (song.title || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (song.artist || '').toLowerCase().includes(searchText.toLowerCase());
      const matchSmart = !filterSmartOnly || setlistSongMeta?.[song.id]?.smartFeatured === true;
      // The "hide completed songs" switch: when ON it filters OUT what is done.
      const matchHideCompleted = !hideCompletedSongs || completedSongs?.[song.id] !== true;
      return matchSearch && matchSmart && matchHideCompleted;
    });
  }, [setlistSongs, searchText, filterSmartOnly, hideCompletedSongs, completedSongs, setlistSongMeta]);

  const hasActiveFilters = Boolean(searchText || filterSmartOnly || hideCompletedSongs);

  const smartPlan = useMemo(() => {
    if (!Array.isArray(setlistSongs) || setlistSongs.length === 0) return null;
    return buildSmartSetlistPlan(setlistSongs, {
      targetMinutes: smartTargetMinutes,
      strategy: smartStrategy,
    });
  }, [setlistSongs, smartTargetMinutes, smartStrategy]);

  const featuredSongIdsFromMeta = useMemo(() => {
    const meta = typeof setlist?.setlistSongMeta === 'object' && !Array.isArray(setlist.setlistSongMeta)
      ? setlist.setlistSongMeta
      : {};
    return (localOrder || []).filter((songId) => meta?.[songId]?.smartFeatured === true);
  }, [setlist?.setlistSongMeta, localOrder]);

  const sessionDividers = useMemo(() => {
    if (!Array.isArray(localOrder) || localOrder.length === 0) return [];
    return localOrder
      .map((songId) => {
        const dividerName = (setlistSongMeta?.[songId]?.[SESSION_DIVIDER_META_FIELD] || '').trim();
        if (!dividerName) return null;
        return {
          songId,
          name: dividerName,
        };
      })
      .filter(Boolean);
  }, [localOrder, setlistSongMeta]);

  // Rows are simply the filtered songs in the user's order, with session
  // dividers interleaved. The sorting and grouping branches were removed.
  const filteredSongsWithDividers = useMemo(() => {
    const rows = [];
    for (const song of filteredSongs) {
      const dividerName = (setlistSongMeta?.[song.id]?.[SESSION_DIVIDER_META_FIELD] || '').trim();
      if (dividerName) {
        rows.push({
          type: 'divider',
          songId: song.id,
          name: dividerName,
        });
      }
      rows.push({ type: 'song', song });
    }
    return rows;
  }, [filteredSongs, setlistSongMeta]);

  const displayedSongRows = filteredSongsWithDividers;

  const mergeCandidateSetlists = useMemo(() => {
    if (!Array.isArray(setlists)) return [];
    const term = mergeSetlistSearch.trim().toLowerCase();
    return setlists
      .filter((item) => String(item.id) !== String(setlist?.id))
      .filter((item) => {
        if (!term) return true;
        return (item.name || '').toLowerCase().includes(term) || (item.bandName || '').toLowerCase().includes(term);
      });
  }, [setlists, setlist?.id, mergeSetlistSearch]);

  const orderedSetlistRows = useMemo(() => {
    if (!Array.isArray(localOrder) || localOrder.length === 0) {
      return (setlistSongs || []).map((song) => ({ type: 'song', song }));
    }

    const songMap = new Map((setlistSongs || []).map((song) => [song.id, song]));
    const rows = [];

    for (const songId of localOrder) {
      const song = songMap.get(songId);
      if (!song) continue;

      const dividerName = (setlistSongMeta?.[songId]?.[SESSION_DIVIDER_META_FIELD] || '').trim();
      if (dividerName) {
        rows.push({ type: 'divider', songId, name: dividerName });
      }

      rows.push({ type: 'song', song });
    }

    return rows;
  }, [localOrder, setlistSongMeta, setlistSongs]);

  const shareSetlistRows = useMemo(() => {
    if (Array.isArray(filteredSongsWithDividers) && filteredSongsWithDividers.length > 0) {
      return filteredSongsWithDividers;
    }
    return orderedSetlistRows;
  }, [filteredSongsWithDividers, orderedSetlistRows]);

  const shareSessionOptions = useMemo(() => {
    if (!Array.isArray(shareSetlistRows) || shareSetlistRows.length === 0) return [];

    const options = [];
    let hasSongsBeforeFirstDivider = false;
    let hasEncounteredDivider = false;

    for (const row of shareSetlistRows) {
      if (row.type === 'divider') {
        hasEncounteredDivider = true;
        options.push({
          value: String(row.songId),
          label: row.name,
        });
        continue;
      }

      if (!hasEncounteredDivider) {
        hasSongsBeforeFirstDivider = true;
      }
    }

    if (hasSongsBeforeFirstDivider && options.length > 0) {
      options.unshift({ value: '__no_divider__', label: 'Tanpa Divider' });
    }

    return options;
  }, [shareSetlistRows]);

  const shareRowsForSelectedSession = useMemo(() => {
    if (shareSessionFilter === 'all') return shareSetlistRows;
    if (!Array.isArray(shareSetlistRows) || shareSetlistRows.length === 0) return [];

    if (shareSessionFilter === '__no_divider__') {
      const rows = [];
      for (const row of shareSetlistRows) {
        if (row.type === 'divider') break;
        rows.push(row);
      }
      return rows.filter((row) => row.type === 'song');
    }

    const rows = [];
    let inSelectedSession = false;
    let sessionClosed = false;

    for (const row of shareSetlistRows) {
      if (sessionClosed) break;

      if (row.type === 'divider') {
        if (inSelectedSession) {
          sessionClosed = true;
          break;
        }

        if (String(row.songId) === String(shareSessionFilter)) {
          inSelectedSession = true;
          rows.push(row);
        }
        continue;
      }

      if (inSelectedSession) {
        rows.push(row);
      }
    }

    return rows;
  }, [shareSetlistRows, shareSessionFilter]);

  const activeShareRows = useMemo(() => {
    if (shareSessionFilter === 'all') return shareSetlistRows;
    if (Array.isArray(shareRowsForSelectedSession) && shareRowsForSelectedSession.length > 0) {
      return shareRowsForSelectedSession;
    }
    return shareSetlistRows;
  }, [shareRowsForSelectedSession, shareSessionFilter, shareSetlistRows]);

  useEffect(() => {
    if (shareSessionFilter === 'all') return;
    const stillExists = shareSessionOptions.some((option) => option.value === shareSessionFilter);
    if (!stillExists) {
      setShareSessionFilter('all');
    }
  }, [shareSessionFilter, shareSessionOptions]);

  useEffect(() => {
    if (!activeVideoSong) return;
    // A new song starts from zero, so the marker progress bar does not briefly
    // show the previous song's position.
    setVideoPlayback({ time: 0, duration: 0 });
    let attempts = 0;
    const maxAttempts = 20;
    const intervalId = setInterval(() => {
      attempts += 1;
      if (videoRef.current && typeof videoRef.current.handlePlay === 'function') {
        videoRef.current.handlePlay();
        clearInterval(intervalId);
        return;
      }
      if (attempts >= maxAttempts) {
        clearInterval(intervalId);
      }
    }, 200);
    return () => clearInterval(intervalId);
  }, [activeVideoSong]);

  useEffect(() => {
    if (!activeVideoSong) return;
    const rafId = window.requestAnimationFrame(() => {
      if (activeInlinePlayerRef.current) {
        activeInlinePlayerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [activeVideoSong]);

  useEffect(() => {
    if (activeVideoSong && !hasYouTubeVideo(activeVideoSong)) {
      setActiveVideoSong(null);
    }
  }, [activeVideoSong]);

  useEffect(() => {
    return () => {
      setIsMetronomeActive(false);
    };
  }, [setIsMetronomeActive]);

  const currentMetronomeSong = useMemo(() => {
    if (!metronomeSongId) return null;
    return (setlistSongs || []).find((song) => song.id === metronomeSongId) || null;
  }, [metronomeSongId, setlistSongs]);

  const createOverlayDismissHandler = (onClose) => (e) => {
    if (e.target.classList.contains('modal-overlay')) onClose();
  };

  const createEscapeDismissHandler = (onClose) => (e) => {
    if (e.key === 'Escape') onClose();
  };

  const closeSessionDividerModal = () => setShowSessionDividerModal(false);
  const closeShareModal = () => setShowShareModal(false);
  const closeCopyModal = () => setShowCopyModal(false);
  const closeSmartModal = () => setShowSmartModal(false);
  const closeAddSongModal = () => setShowAddSong(false);
  const closeMergeSetlistModal = () => setShowMergeSetlistModal(false);
  const closeEditSongModal = () => setEditSongId(null);

  // Key asli lagu master untuk ditampilkan sebagai hint di modal edit
  const editSongModalBaseKey = editSongId != null
    ? baseSongMap.get(editSongId)?.key || ''
    : '';

  // Early returns AFTER all hooks
  if (isLoading) {
    /* Lazy load: skeleton kartu lagu, konsisten dengan halaman daftar lagu */
    return (
      <div className="main-content page-container">
        <SongListSkeleton count={6} />
      </div>
    );
  }
  if (!setlist) return <div className="main-content error-text">Setlist tidak ditemukan atau offline cache kosong</div>;

  function handleClearFilters() {
    setSearchText('');
    setFilterSmartOnly(false);
    setHideCompletedSongs(false);
  }

  // Generate share text
  const shareUrl = `${window.location.origin}/setlists/${setlist.id}`;
  const bandText = setlist.bandName ? `🎸 Band: ${setlist.bandName}\n` : '';
  const selectedSessionOption = shareSessionOptions.find((option) => option.value === shareSessionFilter) || null;
  const sessionTitleText = selectedSessionOption && shareSessionFilter !== 'all'
    ? `📌 Sesi: ${selectedSessionOption.label}\n`
    : '';
  const hasSessionDividerInShare = activeShareRows.some((row) => row.type === 'divider');

  function formatShareLines(includeSongDetails) {
    let songNumber = 0;
    let sessionNumber = 0;

    return activeShareRows
      .map((row) => {
        if (row.type === 'divider') {
          sessionNumber += 1;
          return `\n=== SESI ${sessionNumber}: ${row.name.toUpperCase()} ===`;
        }

        const song = row.song;
        songNumber += 1;
        const completedPrefix = completedSongs?.[song.id] === true ? '✅ (selesai) ' : '';
        if (!includeSongDetails) {
          return `${songNumber}. ${completedPrefix}${song.title}${song.artist ? ` - ${song.artist}` : ''}`;
        }

        const youtubeUrl = (() => {
          if (song.youtubeId) return `https://www.youtube.com/watch?v=${song.youtubeId}`;
          if (song.youtube_url) return song.youtube_url;
          return '';
        })();
        const songKey = song.key ? ` [${song.key}]` : '';
        const songTempo = song.tempo ? ` (${song.tempo} BPM)` : '';
        const songLine = `${songNumber}. ${completedPrefix}${song.title}${song.artist ? ` - ${song.artist}` : ''}${songKey}${songTempo}`;

        if (!youtubeUrl) {
          return songLine;
        }

        return `${songLine}\n   🎬 ${youtubeUrl}`;
      })
      .join('\n')
        .trim();
  }

  const shareText =
    shareFormat === 'title-artist-only'
      ? `${bandText}🎶 Setlist: ${setlist.name}\n\n` +
        `${sessionTitleText}` +
        `${hasSessionDividerInShare ? 'Pembagian sesi:\n' : ''}${formatShareLines(false)}`
      : shareFormat === 'title-artist-key-tempo'
        ? `${bandText}🎶 Setlist: ${setlist.name}\n\n` +
          `${sessionTitleText}` +
          `${hasSessionDividerInShare ? 'Pembagian sesi:\n' : ''}${formatShareLines(true)}` +
          `\n\nLihat detail & chord: ${shareUrl}`
        : `${bandText}🎶 Setlist: ${setlist.name}\n\n` +
          `${sessionTitleText}` +
          `${hasSessionDividerInShare ? 'Pembagian sesi:\n' : ''}${formatShareLines(true)}` +
          `\n\nLihat detail & chord: ${shareUrl}`;


  function handleCopyShare() {
    navigator.clipboard.writeText(shareText);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  }

  async function handleDownloadPoster() {
    if (!posterRef.current || !setlist) return;
    setIsGeneratingPoster(true);
    setPosterError('');

    const safeName = (setlist.name || 'setlist')
      .replace(/[\/:*?"<>|]+/g, '')
      .trim();

    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${safeName || 'setlist'}-poster.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      setPosterError('Gagal membuat poster. Coba lagi.');
      console.error('Gagal membuat poster (html2canvas):', err);
    } finally {
      setIsGeneratingPoster(false);
    }
  }

  async function handleDownloadPDF() {
    if (!posterRef.current || !setlist) return;
    setIsGeneratingPoster(true);
    setPosterError('');

    const safeName = (setlist.name || 'setlist')
      .replace(/[\/:*?"<>|]+/g, '')
      .trim();

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      // Ukuran poster default: 1080x1350 px, konversi ke mm (A4: 210x297mm)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      // Hitung rasio agar poster fit di A4
      const imgProps = { width: canvas.width, height: canvas.height };
      let pdfWidth = pageWidth;
      let pdfHeight = (imgProps.height * pageWidth) / imgProps.width;
      if (pdfHeight > pageHeight) {
        pdfHeight = pageHeight;
        pdfWidth = (imgProps.width * pageHeight) / imgProps.height;
      }
      const x = (pageWidth - pdfWidth) / 2;
      const y = (pageHeight - pdfHeight) / 2;
      pdf.addImage(imgData, 'PNG', x, y, pdfWidth, pdfHeight);
      pdf.save(`${safeName || 'setlist'}-poster.pdf`);
    } catch (err) {
      setPosterError('Gagal membuat PDF. Coba lagi.');
      console.error('Gagal membuat PDF poster:', err);
    } finally {
      setIsGeneratingPoster(false);
    }
  }

  // Handler copy setlist
  async function handleCopySetlist() {
    if (!copyName.trim()) {
      setCopyError('Nama setlist tidak boleh kosong');
      return;
    }
    setCopying(true);
    setCopyError('');
    try {
      const copyData = {
        name: copyName.trim(),
        description: setlist.description || '',
        bandId: setlist.bandId || null,
        songs: setlist.songs || [],
        setlistSongMeta: setlist.setlistSongMeta || {}
      };
      const res = await fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authUtils.getAuthHeader() },
        body: JSON.stringify(copyData),
      });
      if (!res.ok) throw new Error('Gagal copy setlist');
      const { id: newId } = await res.json();
      // Update local setlists state
      if (setSetlists) {
        const newSetlist = {
          ...setlist,
          id: newId,
          name: copyName.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setSetlists(prev => [newSetlist, ...prev]);
      }
      setShowCopyModal(false);
      setCopyName('');
      // Navigate to the new setlist
      navigate(`/setlists/${newId}`);
    } catch (e) {
      setCopyError(e.message || 'Gagal copy setlist');
    } finally {
      setCopying(false);
    }
  }

  // Lagu yang belum ada di setlist
  const availableSongs = availableSongsPool.filter(song => !(localOrder || []).includes(song.id));
  const filteredAvailableSongs = availableSongs.filter(song =>
    (song.title || '').toLowerCase().includes(addSongSearch.toLowerCase()) ||
    (song.artist || '').toLowerCase().includes(addSongSearch.toLowerCase())
  );

  async function handleQuickAddSongFromSetlist() {
    const title = quickAddTitleCandidate;
    if (!title || !canQuickCreateSong) return;

    setIsQuickAddingSong(true);
    setAddSongError('');
    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authUtils.getAuthHeader() },
        body: JSON.stringify({
          title,
          bandId: setlist?.bandId || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.id) {
        throw new Error(data?.error || 'Gagal menambahkan lagu cepat');
      }

      const quickSong = {
        id: data.id,
        title,
        artist: '',
        key: '',
        tempo: '',
        genre: '',
        bandId: setlist?.bandId || null,
      };

      setQuickCreatedSongs((prev) => prev.some((song) => song.id === quickSong.id) ? prev : [quickSong, ...prev]);
      setAddingSongIds((ids) => ids.includes(quickSong.id) ? ids : [...ids, quickSong.id]);
      setAddSongSearch('');
    } catch (e) {
      setAddSongError(e.message || 'Gagal menambahkan lagu cepat');
    } finally {
      setIsQuickAddingSong(false);
    }
  }

  // Handler drag and drop
  async function handleReorder(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const newOrder = Array.from(localOrder);
    const [removed] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, removed);
    setLocalOrder(newOrder);
    if (setSetlists) {
      setSetlists(prev => prev.map(s => s.id === setlist.id ? { ...s, songs: newOrder } : s));
    }
    try {
      await fetch(`/api/setlists/${setlist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authUtils.getAuthHeader() },
        body: JSON.stringify({ ...setlist, songs: newOrder }),
      });
    } catch (e) {
      console.error('Gagal update urutan setlist ke backend', e);
    }
  }

  async function handleEditSongOrder(songId) {
    if (!canEdit) return;

    const fromIdx = localOrder.indexOf(songId);
    if (fromIdx < 0) return;

    const songTitle = availableSongsPool.find((song) => song.id === songId)?.title || 'Lagu ini';
    const input = window.prompt(
      `Pindahkan "${songTitle}" ke urutan berapa? (1-${localOrder.length})`,
      String(fromIdx + 1)
    );

    if (input === null) return;

    const parsedTarget = Number.parseInt(String(input).trim(), 10);
    if (!Number.isFinite(parsedTarget) || parsedTarget < 1 || parsedTarget > localOrder.length) {
      setOrderError(`Nomor urutan harus antara 1 sampai ${localOrder.length}.`);
      return;
    }

    const toIdx = parsedTarget - 1;
    if (toIdx === fromIdx) return;

    await handleReorder(fromIdx, toIdx);
  }

  // Handler tambah lagu ke setlist
  // Handler batch tambah lagu ke setlist
  async function handleAddSongsToSetlist() {
    if (!addingSongIds.length) return;
    setIsAddingSongs(true);
    setAddSongError('');
    // Gabungkan localOrder (lagu lama) + lagu baru, lalu dedup
    const combined = [...localOrder, ...addingSongIds];
    const seen = new Set();
    const deduped = [];
    for (const id of combined) {
      if (!seen.has(id)) {
        seen.add(id);
        deduped.push(id);
      }
    }
    setLocalOrder(deduped);
    if (setSetlists) {
      setSetlists(prev => prev.map(s => s.id === setlist.id ? { ...s, songs: deduped } : s));
    }
    try {
      const res = await fetch(`/api/setlists/${setlist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authUtils.getAuthHeader() },
        body: JSON.stringify({ ...setlist, songs: deduped }),
      });
      if (!res.ok) throw new Error('Gagal menambah lagu ke setlist');
      setAddSongSearch('');
      setShowAddSong(false);
      setAddingSongIds([]);
    } catch (e) {
      setAddSongError(e.message || 'Gagal menambah lagu');
    } finally {
      setIsAddingSongs(false);
    }
  }

  function openMergeSetlistModal() {
    setMergeSetlistError('');
    setMergeSetlistSearch('');
    setMergeSourceSetlistIds([]);
    setShowMergeSetlistModal(true);
  }

  async function handleMergeFromSetlist() {
    if (!canEdit) return;
    if (!mergeSourceSetlistIds.length) {
      setMergeSetlistError('Pilih minimal satu setlist sumber terlebih dahulu');
      return;
    }

    const sourceSetlists = Array.isArray(setlists)
      ? mergeSourceSetlistIds
        .map((sourceId) => setlists.find((item) => String(item.id) === String(sourceId)))
        .filter(Boolean)
      : [];

    if (sourceSetlists.length === 0) {
      setMergeSetlistError('Setlist sumber tidak ditemukan');
      return;
    }

    const availableSongIds = new Set((songs || []).map((song) => song.id));

    setIsMergingSetlist(true);
    setMergeSetlistError('');

    const currentOrder = Array.isArray(localOrder) ? localOrder : [];
    const currentSongIdSet = new Set(currentOrder);
    const currentMeta = typeof setlist?.setlistSongMeta === 'object' && !Array.isArray(setlist.setlistSongMeta)
      ? { ...setlist.setlistSongMeta }
      : {};
    const mergedMeta = { ...currentMeta };
    const mergedSourceSongs = [];

    for (const sourceSetlist of sourceSetlists) {
      const sourceSongs = Array.isArray(sourceSetlist.songs) ? sourceSetlist.songs : [];
      const sourceMeta = typeof sourceSetlist?.setlistSongMeta === 'object' && !Array.isArray(sourceSetlist.setlistSongMeta)
        ? sourceSetlist.setlistSongMeta
        : {};

      for (const songId of sourceSongs) {
        if (!availableSongIds.has(songId)) continue;
        mergedSourceSongs.push(songId);

        if (currentSongIdSet.has(songId) || mergedMeta[songId] || !sourceMeta[songId] || typeof sourceMeta[songId] !== 'object') {
          continue;
        }

        mergedMeta[songId] = { ...sourceMeta[songId] };
      }
    }

    if (mergedSourceSongs.length === 0) {
      setMergeSetlistError('Setlist sumber yang dipilih tidak memiliki lagu tersedia untuk digabungkan');
      setIsMergingSetlist(false);
      return;
    }

    const combined = [...currentOrder, ...mergedSourceSongs];
    const seen = new Set();
    const deduped = [];
    for (const songId of combined) {
      if (!seen.has(songId)) {
        seen.add(songId);
        deduped.push(songId);
      }
    }

    try {
      await persistSetlistSongs(deduped, mergedMeta);
      setShowMergeSetlistModal(false);
      setMergeSetlistSearch('');
      setMergeSourceSetlistIds([]);
    } catch (e) {
      setMergeSetlistError(e.message || 'Gagal merge lagu dari setlist lain');
    } finally {
      setIsMergingSetlist(false);
    }
  }

  function openAddSessionDivider() {
    setSessionDividerError('');
    setSessionDividerName('');
    setEditingSessionDividerSongId('');
    setSessionDividerSongId(localOrder[0] || '');
    setShowSessionDividerModal(true);
  }

  function openEditSessionDivider(songId) {
    const existingName = (setlistSongMeta?.[songId]?.[SESSION_DIVIDER_META_FIELD] || '').trim();
    setSessionDividerError('');
    setSessionDividerName(existingName);
    setSessionDividerSongId(songId);
    setEditingSessionDividerSongId(songId);
    setShowSessionDividerModal(true);
  }

  async function handleSaveSessionDivider() {
    if (!canEdit) return;
    const dividerName = sessionDividerName.trim();
    if (!dividerName) {
      setSessionDividerError('Nama sesi tidak boleh kosong');
      return;
    }
    if (!sessionDividerSongId) {
      setSessionDividerError('Pilih lagu awal sesi');
      return;
    }

    setIsSavingSessionDivider(true);
    setSessionDividerError('');

    const nextMeta = typeof setlist?.setlistSongMeta === 'object' && !Array.isArray(setlist.setlistSongMeta)
      ? { ...setlist.setlistSongMeta }
      : {};

    if (editingSessionDividerSongId && editingSessionDividerSongId !== sessionDividerSongId) {
      const prevMeta = { ...(nextMeta[editingSessionDividerSongId] || {}) };
      delete prevMeta[SESSION_DIVIDER_META_FIELD];
      if (Object.keys(prevMeta).length > 0) {
        nextMeta[editingSessionDividerSongId] = prevMeta;
      } else {
        delete nextMeta[editingSessionDividerSongId];
      }
    }

    nextMeta[sessionDividerSongId] = {
      ...(nextMeta[sessionDividerSongId] || {}),
      [SESSION_DIVIDER_META_FIELD]: dividerName,
    };

    try {
      await persistSetlistSongs(localOrder, nextMeta);
      setShowSessionDividerModal(false);
      setSessionDividerName('');
      setSessionDividerSongId('');
      setEditingSessionDividerSongId('');
    } catch (e) {
      setSessionDividerError(e.message || 'Gagal menyimpan divider sesi');
    } finally {
      setIsSavingSessionDivider(false);
    }
  }

  async function handleDeleteSessionDivider(songId) {
    if (!canEdit) return;
    const nextMeta = typeof setlist?.setlistSongMeta === 'object' && !Array.isArray(setlist.setlistSongMeta)
      ? { ...setlist.setlistSongMeta }
      : {};
    const songMeta = { ...(nextMeta[songId] || {}) };
    delete songMeta[SESSION_DIVIDER_META_FIELD];

    if (Object.keys(songMeta).length > 0) {
      nextMeta[songId] = songMeta;
    } else {
      delete nextMeta[songId];
    }

    try {
      await persistSetlistSongs(localOrder, nextMeta);
    } catch (e) {
      console.error('Gagal menghapus divider sesi', e);
    }
  }

  async function handleMoveSessionDivider(fromSongId, toSongId) {
    if (!canEdit || !fromSongId || !toSongId || fromSongId === toSongId) return;

    const nextMeta = typeof setlist?.setlistSongMeta === 'object' && !Array.isArray(setlist.setlistSongMeta)
      ? { ...setlist.setlistSongMeta }
      : {};

    const fromSongMeta = { ...(nextMeta[fromSongId] || {}) };
    const toSongMeta = { ...(nextMeta[toSongId] || {}) };
    const movedDividerName = (fromSongMeta[SESSION_DIVIDER_META_FIELD] || '').trim();
    if (!movedDividerName) return;

    const targetDividerName = (toSongMeta[SESSION_DIVIDER_META_FIELD] || '').trim();

    delete fromSongMeta[SESSION_DIVIDER_META_FIELD];
    if (Object.keys(fromSongMeta).length > 0) {
      nextMeta[fromSongId] = fromSongMeta;
    } else {
      delete nextMeta[fromSongId];
    }

    nextMeta[toSongId] = {
      ...toSongMeta,
      [SESSION_DIVIDER_META_FIELD]: movedDividerName,
    };

    // Jika target sudah punya divider, lakukan swap agar divider lama tidak hilang.
    if (targetDividerName) {
      nextMeta[fromSongId] = {
        ...(nextMeta[fromSongId] || {}),
        [SESSION_DIVIDER_META_FIELD]: targetDividerName,
      };
    }

    try {
      await persistSetlistSongs(localOrder, nextMeta);
    } catch (e) {
      console.error('Gagal memindahkan divider sesi', e);
    }
  }

  // Handler edit metadata lagu di setlist
  function openEditSong(songId) {
    setEditSongId(songId);
    const baseSong = availableSongsPool.find(s => s.id === songId);
    const meta = setlistSongMeta[songId];
    if (meta) {
      setEditSongKey(meta.key || baseSong?.key || '');
      setEditSongTempo(meta.tempo || baseSong?.tempo || '');
      setEditSongStyle(meta.genre || baseSong?.genre || '');
    } else if (baseSong) {
      setEditSongKey(baseSong.key || '');
      setEditSongTempo(baseSong.tempo || '');
      setEditSongStyle(baseSong.genre || '');
    }
  }

  async function handleEditSongSave() {
    if (!editSongId) return;
    // Validasi chord
    if (editSongKey && !chordUtils.isValidChord(editSongKey)) {
      setEditSongKeyError('Format chord tidak valid');
      return;
    } else {
      setEditSongKeyError('');
    }
    const newSetlistSongMeta = typeof setlist.setlistSongMeta === 'object' && !Array.isArray(setlist.setlistSongMeta)
      ? { ...setlist.setlistSongMeta }
      : {};
    newSetlistSongMeta[editSongId] = {
      key: editSongKey,
      tempo: editSongTempo,
      genre: editSongStyle
    };
    if (setSetlists) {
      setSetlists(prev => prev.map(s => s.id === setlist.id ? { ...s, setlistSongMeta: newSetlistSongMeta } : s));
    }
    try {
      await fetch(`/api/setlists/${setlist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authUtils.getAuthHeader() },
        body: JSON.stringify({
          bandId: setlist.bandId,
          setlistSongMetaPatch: {
            [editSongId]: newSetlistSongMeta[editSongId]
          }
        }),
      });
      setEditSongId(null);
    } catch (e) {
      console.error('Gagal update detail lagu di setlist', e);
    }
  }

  // Handler hapus lagu dari setlist
  async function handleDeleteSongFromSetlist(songId) {
    setConfirmDeleteSongId(songId);
  }

  async function persistSetlistSongs(newOrder, nextSetlistSongMeta = null, nextCompletedSongs = null) {
    const mergedMeta = nextSetlistSongMeta || setlist.setlistSongMeta || {};
    const mergedCompletedSongs = nextCompletedSongs !== null
      ? nextCompletedSongs
      : (typeof setlist?.completedSongs === 'object' && !Array.isArray(setlist.completedSongs) ? setlist.completedSongs : {});
    setLocalOrder(newOrder);
    if (setSetlists) {
      setSetlists(prev => prev.map(s => s.id === setlist.id ? { ...s, songs: newOrder, setlistSongMeta: mergedMeta, completedSongs: mergedCompletedSongs } : s));
    }
    await fetch(`/api/setlists/${setlist.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authUtils.getAuthHeader() },
      body: JSON.stringify({ ...setlist, songs: newOrder, setlistSongMeta: mergedMeta, completedSongs: mergedCompletedSongs }),
    });
  }

  async function handleToggleSongCompleted(songId) {
    if (!canEdit) return;

    const currentCompletedSongs = typeof setlist?.completedSongs === 'object' && !Array.isArray(setlist.completedSongs)
      ? { ...setlist.completedSongs }
      : {};

    const nextCompletedSongs = { ...currentCompletedSongs };
    if (nextCompletedSongs[songId]) {
      delete nextCompletedSongs[songId];
    } else {
      nextCompletedSongs[songId] = true;
    }

    if (setSetlists) {
      setSetlists(prev => prev.map(s => s.id === setlist.id ? { ...s, completedSongs: nextCompletedSongs } : s));
    }

    try {
      await fetch(`/api/setlists/${setlist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authUtils.getAuthHeader() },
        body: JSON.stringify({
          ...setlist,
          songs: localOrder,
          setlistSongMeta,
          completedSongs: nextCompletedSongs,
        }),
      });
    } catch (e) {
      console.error('Gagal update status lagu selesai', e);
    }
  }

  async function handleResetCompletedSongs() {
    if (!canEdit || completedCount === 0) return;

    if (setSetlists) {
      setSetlists(prev => prev.map(s => s.id === setlist.id ? { ...s, completedSongs: {} } : s));
    }

    try {
      await fetch(`/api/setlists/${setlist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authUtils.getAuthHeader() },
        body: JSON.stringify({
          ...setlist,
          songs: localOrder,
          setlistSongMeta,
          completedSongs: {},
        }),
      });
    } catch (e) {
      console.error('Gagal mereset status lagu selesai', e);
    }
  }

  // Tandai SEMUA lagu di setlist sebagai selesai sekaligus.
  async function handleMarkAllSongsCompleted() {
    if (!canEdit || setlistSongs.length === 0) return;

    const nextCompletedSongs = { ...completedSongs };
    for (const song of setlistSongs) {
      nextCompletedSongs[song.id] = true;
    }

    if (setSetlists) {
      setSetlists(prev => prev.map(s => s.id === setlist.id ? { ...s, completedSongs: nextCompletedSongs } : s));
    }

    try {
      await fetch(`/api/setlists/${setlist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authUtils.getAuthHeader() },
        body: JSON.stringify({
          ...setlist,
          songs: localOrder,
          setlistSongMeta,
          completedSongs: nextCompletedSongs,
        }),
      });
    } catch (e) {
      console.error('Gagal menandai semua lagu selesai', e);
    }
  }

  // Buka detail lagu (halaman chord/player).
  function openSongDetail(song) {
    if (!song) return;
    navigate(`/setlists/${setlist.id}/songs/${song.id}`, {
      state: {
        setlistId: setlist.id,
        setlist: { ...setlist, songs: setlistSongs },
        setlistSong: song,
      },
    });
  }

  async function handleApplySmartSetlist() {
    if (!canEdit || !smartPlan || !Array.isArray(smartPlan.orderedSongIds)) return;
    setSmartApplying(true);
    setSmartError('');
    try {
      const currentMeta = typeof setlist?.setlistSongMeta === 'object' && !Array.isArray(setlist.setlistSongMeta)
        ? { ...setlist.setlistSongMeta }
        : {};
      const featuredSet = new Set(smartPlan.featuredSongIds || []);
      const updatedMeta = { ...currentMeta };
      for (const songId of smartPlan.orderedSongIds) {
        const prevSongMeta = updatedMeta[songId] || {};
        updatedMeta[songId] = {
          ...prevSongMeta,
          smartFeatured: featuredSet.has(songId),
        };
      }
      await persistSetlistSongs(smartPlan.orderedSongIds, updatedMeta);
      setShowSmartModal(false);
    } catch (e) {
      setSmartError(e.message || 'Gagal menerapkan Smart Setlist');
    } finally {
      setSmartApplying(false);
    }
  }

  async function handleClearSmartPicks() {
    if (!canEdit) return;
    setSmartApplying(true);
    setSmartError('');
    try {
      const currentMeta = typeof setlist?.setlistSongMeta === 'object' && !Array.isArray(setlist.setlistSongMeta)
        ? { ...setlist.setlistSongMeta }
        : {};

      const updatedMeta = { ...currentMeta };
      for (const songId of localOrder || []) {
        const prevSongMeta = updatedMeta[songId] || {};
        if (Object.prototype.hasOwnProperty.call(prevSongMeta, 'smartFeatured')) {
          const { smartFeatured, ...restMeta } = prevSongMeta;
          if (Object.keys(restMeta).length > 0) {
            updatedMeta[songId] = restMeta;
          } else {
            delete updatedMeta[songId];
          }
        }
      }

      await persistSetlistSongs(localOrder, updatedMeta);
      setFilterSmartOnly(false);
    } catch (e) {
      setSmartError(e.message || 'Gagal menghapus Smart Picks');
    } finally {
      setSmartApplying(false);
    }
  }

  async function confirmDeleteSong() {
    if (!confirmDeleteSongId) return;
    setDeleting(true);
    const songId = confirmDeleteSongId;
    const newOrder = localOrder.filter(id => id !== songId);
    const nextCompletedSongs = typeof setlist?.completedSongs === 'object' && !Array.isArray(setlist.completedSongs)
      ? { ...setlist.completedSongs }
      : {};
    delete nextCompletedSongs[songId];
    try {
      await persistSetlistSongs(newOrder, null, nextCompletedSongs);
    } catch (e) {
      console.error('Gagal hapus lagu dari setlist', e);
    }
    setDeleting(false);
    setConfirmDeleteSongId(null);
  }

  function hasYouTubeVideo(song) {
    return Boolean(song?.youtubeId || song?.youtube_url);
  }

  function resolveTempo(song) {
    const parsed = parseInt(song?.tempo, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 120;
  }

  function handleToggleMetronome(song, e) {
    e.stopPropagation();
    if (isMetronomeActive && metronomeSongId === song.id) {
      setIsMetronomeActive(false);
      setMetronomeSongId(null);
      return;
    }
    setMetronomeTempo(resolveTempo(song));
    setMetronomeSongId(song.id);
    setIsMetronomeActive(true);
  }

  function handlePlayVideo(song, e) {
    e.stopPropagation();
    if (!hasYouTubeVideo(song)) return;
    setIsSequentialVideoMode(false);
    setActiveVideoSong(song);
  }

  function handleSequentialVideoPlayback(startSongId = null) {
    const queue = (setlistSongs || []).filter((song) => hasYouTubeVideo(song));
    if (!queue.length) return;

    const startIndex = startSongId ? queue.findIndex((song) => song.id === startSongId) : 0;
    const targetSong = queue[startIndex >= 0 ? startIndex : 0];
    setIsSequentialVideoMode(true);
    setActiveVideoSong(targetSong);
  }

  function handleNextSequentialVideo(currentSongId) {
    const queue = (setlistSongs || []).filter((song) => hasYouTubeVideo(song));
    if (!queue.length) return;

    const currentIndex = queue.findIndex((song) => song.id === currentSongId);
    const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;

    if (nextIndex >= queue.length) {
      // End of the queue: stop instead of looping back to the first video.
      setIsSequentialVideoMode(false);
      if (videoRef.current && typeof videoRef.current.handlePause === 'function') {
        videoRef.current.handlePause();
      }
      setActiveVideoSong(null);
      return;
    }

    setIsSequentialVideoMode(true);
    setActiveVideoSong(queue[nextIndex]);
  }

  function handlePreviousSequentialVideo(currentSongId) {
    const queue = (setlistSongs || []).filter((song) => hasYouTubeVideo(song));
    if (!queue.length) return;

    const currentIndex = queue.findIndex((song) => song.id === currentSongId);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : 0;

    setIsSequentialVideoMode(true);
    setActiveVideoSong(queue[previousIndex]);
  }

  function handleCloseVideoPlayer() {
    setIsSequentialVideoMode(false);
    if (videoRef.current && typeof videoRef.current.handlePause === 'function') {
      videoRef.current.handlePause();
    }
    setActiveVideoSong(null);
  }

  function handleYouTubeStateChange(event, songId) {
    if (!event || !isSequentialVideoMode || event.data !== 0) return;
    handleNextSequentialVideo(songId);
  }

  function isSongPlaying(songId) {
    if (isMetronomeActive && metronomeSongId === songId) return true;
    if (activeVideoSong?.id === songId) return true;
    return false;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="setlist-header-info">
          <h1>📋 {setlist.name}</h1>
          {setlist.bandName && (
            <div className="setlist-band-name">🎸 {setlist.bandName}</div>
          )}
          {setlist.description && (
            <div className="setlist-description">{setlist.description}</div>
          )}
          <div className="setlist-header-stats">
            <span className="setlist-meta-badge">🎵 {setlistSongs.length} lagu</span>
            <span className={`setlist-meta-badge${completedCount > 0 ? ' setlist-meta-band' : ''}`}>
              ✅ {completedCount} selesai
            </span>
            {featuredSongIdsFromMeta.length > 0 && (
              <span
                className="setlist-meta-badge"
                title="Ditandai sebagai blok show utama Smart Assistant"
              >
                ✨ {featuredSongIdsFromMeta.length} smart pick
              </span>
            )}
          </div>
        </div>
        <div className="setlist-header-actions setlist-header-actions-compact">
          {/* Only the primary action sits outside. Everything else lives in the
              menu, so the header states one job instead of offering seven
              equally-weighted buttons. */}
          {canEdit && (
            <button className="btn setlist-btn-primary" onClick={() => setShowAddSong(true)} title="Tambah Lagu ke Setlist">
              <span className="setlist-btn-icon" aria-hidden="true">＋</span>
              <span className="setlist-btn-label">Tambah Lagu</span>
            </button>
          )}

          <details className="setlist-header-more" aria-label="Aksi tambahan setlist">
            <summary className="btn btn-secondary">
              <span className="setlist-header-more-icon" aria-hidden="true">⚙</span>
              <span className="setlist-header-more-label">Aksi Lainnya</span>
            </summary>
            <div className="setlist-header-more-menu">
              <button
                className="btn btn-secondary setlist-btn-ghost"
                onClick={() => {
                  setShareSessionFilter('all');
                  setShowShareModal(true);
                }}
                title="Bagikan Setlist"
              >
                📤 Bagikan
              </button>
              {canEdit && (
                <button className="btn btn-secondary setlist-btn-ghost" onClick={openMergeSetlistModal} title="Merge lagu dari setlist lain">
                  🔀 Merge Setlist
                </button>
              )}
              {canEdit && (
                <button className="btn setlist-btn-ghost" onClick={() => setShowSmartModal(true)} title="Urutkan otomatis berdasarkan key, tempo, energi, dan durasi">
                  ✨ Smart Assistant
                </button>
              )}
              {canEdit && (
                <button className="btn btn-secondary setlist-btn-ghost" onClick={openAddSessionDivider} title="Tambah divider sesi">
                  🧩 Divider Sesi
                </button>
              )}
              {hasSequentialVideoSet && (
                <button
                  className={`btn ${isSequentialVideoMode ? 'setlist-btn-primary' : 'btn-secondary'} setlist-btn-ghost`}
                  onClick={() => {
                    if (isSequentialVideoMode) {
                      handleCloseVideoPlayer();
                      return;
                    }
                    handleSequentialVideoPlayback();
                  }}
                  title={isSequentialVideoMode ? 'Hentikan pemutaran video berurutan' : 'Putar video setlist berurutan'}
                  aria-label={isSequentialVideoMode ? 'Hentikan pemutaran video setlist berurutan' : 'Putar video setlist berurutan'}
                >
                  🎬 {isSequentialVideoMode ? 'Berhenti' : 'Putar Berurutan'}
                </button>
              )}
              {canEdit && featuredSongIdsFromMeta.length > 0 && (
                <button
                  className="btn btn-secondary setlist-btn-ghost"
                  onClick={handleClearSmartPicks}
                  title="Hapus semua badge Smart Pick dari setlist"
                  disabled={smartApplying}
                >
                  {smartApplying ? 'Memproses...' : 'Clear Smart Picks'}
                </button>
              )}
              {canEdit && completedCount > 0 && (
                <button
                  className="btn btn-secondary setlist-btn-ghost"
                  onClick={handleResetCompletedSongs}
                  title="Reset semua status lagu selesai"
                >
                  ↺ Reset Selesai
                </button>
              )}
              {canEdit && uncompletedCount > 0 && (
                <button
                  className="btn btn-secondary setlist-btn-ghost"
                  onClick={handleMarkAllSongsCompleted}
                  title="Tandai semua lagu selesai"
                >
                  ✅ Tandai Semua Selesai
                </button>
              )}
              <button className="btn setlist-btn-ghost" onClick={() => setShowCopyModal(true)} title="Copy Setlist">
                📋 Copy Setlist
              </button>
            </div>
          </details>
        </div>
      </div>

      {/* Filter dan Search Bar */}
      {(
        <div className="filter-container">
          <input
            type="text"
            placeholder="🔍 Cari judul atau artis..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input-main"
          />
          <div className="filter-row">
            {/* Songs always follow the user's own order, so there is no sort
                control. The only list control left is this switch. */}
            {/* Switch ini hanya berguna bila ada lagu yang selesai. */}
            <label
              className={`song-visibility-toggle${completedCount === 0 ? ' is-disabled' : ''}`}
              htmlFor="hide-completed-songs"
              title={
                completedCount === 0
                  ? 'Belum ada lagu yang ditandai selesai'
                  : 'Sembunyikan atau tampilkan lagu yang selesai'
              }
            >
              <input
                id="hide-completed-songs"
                type="checkbox"
                className="song-visibility-checkbox"
                checked={hideCompletedSongs}
                disabled={completedCount === 0}
                onChange={(e) => setHideCompletedSongs(e.target.checked)}
              />
              <span className="song-visibility-track" aria-hidden="true">
                <span className="song-visibility-knob" />
              </span>
              <span className="song-visibility-text">
                <span className="song-visibility-label">
                  Sembunyikan lagu yang selesai
                </span>
                {completedCount > 0 && (
                  <span className="song-visibility-count">
                    {completedCount} dari {setlistSongs.length} selesai
                  </span>
                )}
              </span>
            </label>
            {featuredSongIdsFromMeta.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterSmartOnly((v) => !v)}
                className={`btn ${filterSmartOnly ? '' : 'btn-secondary'}`}
                aria-pressed={filterSmartOnly}
                title="Filter lagu Smart Pick"
              >
                {filterSmartOnly ? '✨ Smart Pick Saja (Aktif)' : '✨ Smart Pick Saja'}
              </button>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn btn-secondary"
              >
                ✕ Reset
              </button>
            )}
          </div>
        </div>
      )}

      {orderError && (
        <div className="error-text" role="alert">
          {orderError}
          <button
            type="button"
            className="user-management-banner-close"
            onClick={() => setOrderError('')}
          >×</button>
        </div>
      )}

      {filteredSongs.length === 0 ? (
        <div className="empty-state">
          <p>
            {hasActiveFilters ? 'Tidak ada lagu yang cocok dengan filter' : 'Setlist ini belum berisi lagu'}
          </p>
          {/* Tombol "Tambah Lagu Pertama" dihapus — tambah lagu cukup lewat
              tombol tambah di header. */}
        </div>
      ) : (
        <div className="song-list-container">
          {displayedSongRows.map((row) => {
            if (row.type === 'divider') {
              return (
                <div
                  key={`divider-${row.songId}`}
                  className="setlist-session-divider"
                  draggable={canEdit}
                  onDragStart={e => {
                    if (!canEdit) return;
                    e.dataTransfer.setData('drag-type', 'session-divider');
                    e.dataTransfer.setData('divider-from-song-id', String(row.songId));
                    e.currentTarget.classList.add('dragging');
                  }}
                  onDragEnd={e => {
                    e.currentTarget.classList.remove('dragging');
                  }}
                  onDragOver={e => {
                    if (!canEdit) return;
                    if (e.dataTransfer.getData('drag-type') !== 'session-divider') return;
                    e.preventDefault();
                    e.currentTarget.classList.add('drag-over');
                  }}
                  onDragLeave={e => {
                    e.currentTarget.classList.remove('drag-over');
                  }}
                  onDrop={e => {
                    if (!canEdit) return;
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-over');
                    const dragType = e.dataTransfer.getData('drag-type');
                    if (dragType !== 'session-divider') return;
                    const fromSongId = e.dataTransfer.getData('divider-from-song-id');
                    handleMoveSessionDivider(fromSongId, row.songId);
                  }}
                >
                  <div className="setlist-session-divider-title">🧩 {row.name}</div>
                  {canEdit && (
                    <div className="setlist-session-divider-actions">
                      <button
                        onClick={() => openEditSessionDivider(row.songId)}
                        className="btn btn-secondary"
                        title="Edit divider sesi"
                      >
                          <span aria-hidden="true">✎</span>
                        </button>
                      <button
                        onClick={() => handleDeleteSessionDivider(row.songId)}
                        className="btn btn-red"
                        title="Hapus divider sesi"
                      >
                          <span aria-hidden="true">🗑</span>
                        </button>
                    </div>
                  )}
                </div>
              );
            }

            const song = row.song;
            const idx = filteredSongs.findIndex(item => item.id === song.id);
            const customIdx = localOrder.indexOf(song.id);
            const displayOrderNumber = customIdx >= 0 ? customIdx + 1 : idx + 1;
            const baseSong = baseSongMap.get(song.id);
            const keyChanged = baseSong && song.key && baseSong.key && song.key !== baseSong.key;
            const tempoChanged = baseSong && song.tempo && baseSong.tempo && song.tempo !== baseSong.tempo;
            const genreChanged = baseSong && song.genre && baseSong.genre && song.genre !== baseSong.genre;
            const isSmartFeatured = setlistSongMeta?.[song.id]?.smartFeatured === true;
            const isCompleted = completedSongs?.[song.id] === true;
            const isInlinePlayerSong = (activeVideoSong?.id === song.id) || (isMetronomeActive && metronomeSongId === song.id);
            const mood = inferSongMood(song);
            // Status mastery dari data base song (masteredBy berisi entri
            // { userId, status: 'mastered' | 'learning' }).
            const viewerId = String(effectiveUser?.userId || effectiveUser?.id || '');            const ownMasteryEntry = Array.isArray(baseSong?.masteredBy)
              ? baseSong.masteredBy.find((entry) => String(entry?.userId) === viewerId)
              : null;
            // Override lokal (chip diubah) diprioritaskan di atas data base song.
            const masteryStatus = masteryOverrides[String(song.id)]?.status
              || ownMasteryEntry?.status
              || (baseSong?.isMasteredByCurrentUser ? 'mastered' : 'none');
            return (
              <React.Fragment key={song.id}>
                <SongCard
                  title={song.title}
                  className={`${isSmartFeatured ? ' song-item-smart-featured' : ''}${isCompleted ? ' song-item-completed' : ''}`}
                  isPlaying={isSongPlaying(song.id)}
                  /* Song-to-song reordering is done with the ⇅ button in the rail:
                     HTML5 drag-and-drop does not fire on touch devices, so the
                     old handle was a control that did nothing on a phone.
                     Drop handling stays for session dividers, which are still
                     draggable from their own handle. */
                  dragProps={{
                    onDragOver: (e) => {
                      if (e.dataTransfer.types.includes('drag-type')) {
                        e.preventDefault();
                        e.currentTarget.classList.add('drag-over');
                      }
                    },
                    onDragLeave: (e) => {
                      e.currentTarget.classList.remove('drag-over');
                    },
                    onDrop: (e) => {
                      e.currentTarget.classList.remove('drag-over');
                      const dragType = e.dataTransfer.getData('drag-type');
                      if (dragType === 'session-divider') {
                        e.preventDefault();
                        const fromSongId = e.dataTransfer.getData('divider-from-song-id');
                        handleMoveSessionDivider(fromSongId, song.id);
                      }
                    },
                  }}
                  onClick={() => navigate(`/setlists/${setlist.id}/songs/${song.id}`, {
                    state: {
                      setlistId: setlist.id,
                      setlist: { ...setlist, songs: setlistSongs },
                      setlistSong: song
                    }
                  })}
                  leadingSlot={(
                    /* Left rail: the number IS the reorder control. One tap opens the
                        reorder prompt, so there is no separate handle to aim at — and
                        no drag, which never fires on touch devices. */
                    <div className="song-rail">
                      {canEdit ? (
                        <button
                          type="button"
                          className="song-number song-number-button"
                          title={`Ubah urutan lagu (sekarang nomor ${displayOrderNumber})`}
                          aria-label={`Ubah nomor urutan ${song.title}, sekarang nomor ${displayOrderNumber}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSongOrder(song.id);
                          }}
                        >
                          {displayOrderNumber}
                        </button>
                      ) : (
                        <span className="song-number">{displayOrderNumber}</span>
                      )}
                      {/* Kontrol utama menandai lagu selesai: satu tap besar di rail,
                          selalu terlihat dan tidak perlu mencari tombol kecil. */}
                      {canEdit && (
                        <button
                          type="button"
                          className={`song-played-toggle${isCompleted ? ' is-completed' : ''}`}
                          title={isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}
                          aria-label={isCompleted ? `Tandai ${song.title} belum selesai` : `Tandai ${song.title} selesai`}
                          aria-pressed={isCompleted}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSongCompleted(song.id);
                          }}
                        >
                          <span aria-hidden="true">{isCompleted ? '✓' : '○'}</span>
                        </button>
                      )}
                    </div>
                  )}
                  headingStatus={(
                    /* Flags stay on the title line: they describe the row's state
                        without competing with the title. */
                    <div className="song-heading-status">
                      {isCompleted && (
                        <span className="song-flag song-flag-done" title="Selesai">
                          ✓ Selesai
                        </span>
                      )}
                      {isSmartFeatured && (
                        <span className="song-flag song-flag-smart" title="Blok show utama Smart Assistant">
                          ✨ Smart Pick
                        </span>
                      )}
                    </div>
                  )}
                  metaPrimary={(
                    <div className="song-meta-line song-meta-line-primary">
                      {/* Artis, key, tempo = fakta inti kartu: satu baris, selalu
                          tampil dan berkontras tinggi. */}
                      {song.artist && <span className="song-meta-text song-fact-artist">👤 {song.artist}</span>}
                      {song.key && (
                        <span className="song-chip song-fact-key">
                          🎹 {song.key}
                          {keyChanged && baseSong?.key ? ` (${baseSong.key})` : ''}
                        </span>
                      )}
                      {song.tempo && (
                        <span className="song-chip song-fact-tempo">
                          ⏱️ {song.tempo} BPM
                          {tempoChanged && baseSong?.tempo ? ` (${baseSong.tempo} BPM)` : ''}
                        </span>
                      )}
                      {song.genre && (
                        <span className="song-chip">
                          🎸 {song.genre}
                          {genreChanged && baseSong?.genre ? ` (${baseSong.genre})` : ''}
                        </span>
                      )}
                      {/* Author (kontributor) tepat setelah genre */}
                      {(song.contributor || song.contributorName) && (
                        <span className="song-meta-text song-meta-text-muted" title={`Ditambahkan oleh: ${song.contributor || song.contributorName}`}>
                          ✍️ {song.contributor || song.contributorName}
                        </span>
                      )}
                    </div>
                  )}
                  metaDetail={(
                    <div className="song-meta-line song-meta-line-detail">
                      {/* Baris detail hanya metadata pendukung; fakta inti ada di baris utama. */}
                      <span className={`song-mood-badge mood-${mood.tone}`} title={`Mood: ${mood.label} (${mood.sourceHint})`}>
                        {mood.label}
                      </span>
                      <span className="song-meta-text song-meta-text-muted">
                        📋 {songUsageCountMap.get(song.id) || 0} setlist
                      </span>
                    </div>
                  )}
                  actions={(
                    <>
                      {hasYouTubeVideo(song) && (
                        <button
                          onClick={(e) => handlePlayVideo(song, e)}
                          className="btn btn-secondary song-action-btn"
                          title="Putar video referensi"
                          aria-label="Play video"
                        >
                          <span aria-hidden="true">🎬</span>
                          <span className="song-action-btn-label">Video</span>
                        </button>
                      )}
                      {/* Status mastery: chip interaktif — klik untuk ubah status. */}
                      <MasteryChip
                        status={masteryStatus}
                        onStatusChange={(next) => handleMasteryChange(song, next)}
                        updating={masteryUpdatingId === song.id}
                        disabled={!viewerId}
                      />
                      {canEdit && (
                        <>
                          <button
                            onClick={() => openEditSong(song.id)}
                            className="btn song-action-btn"
                            title="Edit detail lagu di setlist"
                            aria-label="Edit detail lagu di setlist"
                          >
                            <span aria-hidden="true">✎</span>
                            <span className="song-action-btn-label">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSongFromSetlist(song.id)}
                            className="btn btn-red song-action-btn"
                            title="Hapus dari setlist"
                            aria-label="Hapus dari setlist"
                          >
                            <span aria-hidden="true">🗑</span>
                            <span className="song-action-btn-label">Hapus</span>
                          </button>
                        </>
                      )}
                    </>
                  )}
                />

                {isInlinePlayerSong && (
                  <div
                    ref={activeVideoSong?.id === song.id ? activeInlinePlayerRef : null}
                    className="song-inline-player card song-inline-player-inline"
                  >
                    <div className="song-inline-player-header">
                      <div>
                        <h3>Now Playing</h3>
                        {activeVideoSong?.id === song.id ? (
                          <p>
                            {song.title}
                            {song.artist ? ` - ${song.artist}` : ''}
                            {` | ${resolveTempo(song)} BPM`}
                          </p>
                        ) : (
                          <p>
                            Metronom aktif: {song.title}
                          </p>
                        )}
                      </div>
                      <div className="song-inline-player-actions">
                        <button
                          className={`btn ${isMetronomeActive && metronomeSongId === song.id ? '' : 'btn-secondary'}`}
                          aria-label={isMetronomeActive && metronomeSongId === song.id ? 'Stop metronom' : 'Start metronom'}
                          onClick={(e) => handleToggleMetronome(song, e)}
                        >
                          {isMetronomeActive && metronomeSongId === song.id ? '⏹' : '⏱'}
                        </button>
                        {activeVideoSong?.id === song.id && (
                          <>
                            <button className="btn btn-secondary" aria-label="Video sebelumnya" onClick={() => handlePreviousSequentialVideo(song.id)}>
                              ⏮
                            </button>
                            <button className="btn btn-secondary" aria-label="Video berikutnya" onClick={() => handleNextSequentialVideo(song.id)}>
                              ⏭
                            </button>
                            <button className="btn btn-secondary" aria-label="Tutup video" onClick={handleCloseVideoPlayer}>
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {activeVideoSong?.id === song.id && (
                      /* Video + kontrol + time marker via komponen shared
                         SongMediaPanel (aturan CSS sama dengan halaman lain).
                         Marker read-only: halaman setlist untuk performa, bukan edit. */
                      <SongMediaPanel
                        variant="inline"
                        youtubeId={song.youtubeId || song.youtube_url}
                        youtubeRef={videoRef}
                        autoPlay={Boolean(activeVideoSong)}
                        onStateChange={(event) => handleYouTubeStateChange(event, song.id)}
                        timeMarkers={song.time_markers}
                        readonlyMarkers
                        showMarkers={true}
                        currentTime={videoPlayback.time}
                        duration={videoPlayback.duration}
                        getCurrentYouTubeTime={() =>
                          typeof videoRef.current?.currentTime === 'number' ? videoRef.current.currentTime : 0
                        }
                        onSeek={(seconds) => videoRef.current?.handleSeek?.(seconds)}
                        onTimeUpdate={(t, d) => {
                          setVideoPlayback((prev) => ({
                            time: typeof t === 'number' ? t : prev.time,
                            duration: typeof d === 'number' ? d : prev.duration,
                          }));
                        }}
                        markerExtra={
                          Array.isArray(song.time_markers) && song.time_markers.length === 0 ? (
                            <div className="smp-markers-empty">
                              Lagu ini belum punya time marker. Tambahkan di halaman editor lagu
                              agar bagian-bagiannya bisa dilompati dari sini.
                            </div>
                          ) : null
                        }
                      />
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Modal Divider Sesi */}
      {showSessionDividerModal && canEdit && (
        <div
          className="modal-overlay"
          aria-label="Modal divider sesi"
          onClick={createOverlayDismissHandler(closeSessionDividerModal)}
          tabIndex={-1}
          onKeyDown={createEscapeDismissHandler(closeSessionDividerModal)}
        >
          <div
            className="modal add-song-modal"
            role="dialog"
            aria-modal="true"
            tabIndex={0}
          >
            <div className="modal-title">{editingSessionDividerSongId ? 'Edit Divider Sesi' : 'Tambah Divider Sesi'}</div>
            <label>
              Nama sesi
              <input
                type="text"
                className="modal-input"
                placeholder="Contoh: Sesi Akustik"
                value={sessionDividerName}
                onChange={(e) => setSessionDividerName(e.target.value)}
                maxLength={50}
              />
            </label>
            <label>
              Mulai sebelum lagu
              <select
                className="modal-input"
                value={sessionDividerSongId}
                onChange={(e) => setSessionDividerSongId(e.target.value)}
              >
                <option value="">Pilih lagu</option>
                {localOrder.map((songId, idx) => {
                  const song = availableSongsPool.find((s) => s.id === songId);
                  if (!song) return null;
                  return (
                    <option key={songId} value={songId}>
                      {idx + 1}. {song.title}
                    </option>
                  );
                })}
              </select>
            </label>
            {sessionDividers.length > 0 && (
              <div className="smart-plan-note modal-note-top">
                Divider aktif: {sessionDividers.map(d => d.name).join(', ')}
              </div>
            )}
            {sessionDividerError && <div className="error-text modal-error-top">{sessionDividerError}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={handleSaveSessionDivider} disabled={isSavingSessionDivider}>
                {isSavingSessionDivider ? 'Menyimpan...' : 'Simpan Divider'}
              </button>
              <button className="btn btn-secondary" onClick={closeSessionDividerModal} disabled={isSavingSessionDivider}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi Hapus Lagu dari Setlist */}
      {confirmDeleteSongId && (
        <div className="modal-overlay" tabIndex={-1} aria-label="Konfirmasi hapus lagu dari setlist">
          <div className="modal delete-confirm-modal" role="dialog" aria-modal="true" tabIndex={0}>
            <div className="modal-title">Konfirmasi Hapus Lagu</div>
            <div className="modal-message">
              Apakah Anda yakin ingin menghapus lagu ini dari setlist?
            </div>
            <div className="modal-actions">
              <button className="btn btn-red" onClick={confirmDeleteSong} disabled={deleting}>
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
              <button className="btn btn-secondary" onClick={() => setConfirmDeleteSongId(null)} disabled={deleting}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bagikan Setlist */}
      {showShareModal && (
        <div
          className="modal-overlay"
          aria-label="Modal bagikan setlist"
          onClick={createOverlayDismissHandler(closeShareModal)}
          tabIndex={-1}
          onKeyDown={createEscapeDismissHandler(closeShareModal)}
        >
          <div
            className="modal add-song-modal"
            role="dialog"
            aria-modal="true"
            tabIndex={0}
          >
            <div className="modal-title">Bagikan Setlist</div>
            <SetlistPoster
              setlist={setlist}
              setlistSongs={setlistSongs}
              setlistRows={activeShareRows}
              posterRef={posterRef}
            />
            <div className="filter-row">
              <select
                value={shareFormat}
                onChange={(e) => setShareFormat(e.target.value)}
                className="filter-select"
                aria-label="Format teks bagikan"
              >
                <option value="full">Judul lagu - penyanyi, nada dasar, tempo, link YouTube</option>
                <option value="title-artist-key-tempo">Judul lagu - penyanyi, nada dasar, tempo</option>
                <option value="title-artist-only">Judul lagu + penyanyi</option>
              </select>
              {shareSessionOptions.length > 0 && (
                <select
                  value={shareSessionFilter}
                  onChange={(e) => setShareSessionFilter(e.target.value)}
                  className="filter-select"
                  aria-label="Pilih sesi bagikan"
                >
                  <option value="all">Sesi: Semua</option>
                  {shareSessionOptions.map((sessionOption) => (
                    <option key={sessionOption.value} value={sessionOption.value}>
                      Sesi: {sessionOption.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <textarea
              className="modal-input"
              rows={7}
              value={shareText}
              readOnly
            />
            {posterError && <div className="error-text setlist-poster-error">{posterError}</div>}
            <div className="setlist-share-actions">
              <button className="btn" onClick={handleCopyShare}>
                {shareCopied ? '✅ Tersalin!' : 'Salin Teks'}
              </button>
              <button
                className="btn"
                onClick={handleDownloadPoster}
                disabled={isGeneratingPoster}
              >
                {isGeneratingPoster ? 'Membuat Poster...' : 'Unduh Poster'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPoster}
              >
                {isGeneratingPoster ? 'Membuat PDF...' : 'Download PDF'}
              </button>
              <button className="btn btn-secondary" onClick={closeShareModal}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Copy Setlist */}
      {showCopyModal && (
        <div
          className="modal-overlay"
          aria-label="Modal copy setlist"
          onClick={createOverlayDismissHandler(closeCopyModal)}
          tabIndex={-1}
          onKeyDown={createEscapeDismissHandler(closeCopyModal)}
        >
          <div
            className="modal add-song-modal"
            role="dialog"
            aria-modal="true"
            tabIndex={0}
          >
            <div className="modal-title">Copy Setlist</div>
            <div className="modal-message">
              Buat salinan dari setlist "{setlist.name}" dengan nama baru.
            </div>
            <input
              type="text"
              className="modal-input"
              placeholder="Nama setlist baru"
              value={copyName}
              onChange={(e) => setCopyName(e.target.value)}
              maxLength={100}
            />
            {copyError && <div className="error-text">{copyError}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={handleCopySetlist} disabled={copying}>
                {copying ? 'Mencopy...' : 'Copy Setlist'}
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowCopyModal(false); setCopyName(''); setCopyError(''); }} disabled={copying}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Smart Setlist Assistant */}
      {showSmartModal && canEdit && (
        <div
          className="modal-overlay"
          aria-label="Modal smart setlist assistant"
          onClick={createOverlayDismissHandler(closeSmartModal)}
          tabIndex={-1}
          onKeyDown={createEscapeDismissHandler(closeSmartModal)}
        >
          <div
            className="modal add-song-modal smart-setlist-modal"
            role="dialog"
            aria-modal="true"
            tabIndex={0}
          >
            <div className="modal-title">Smart Setlist Assistant</div>
            <p className="smart-setlist-subtitle">
              Urutkan lagu otomatis berdasarkan transisi key, flow tempo, dan kurva energi.
            </p>

            <label>
              Target Durasi Show (menit, opsional)
              <input
                type="number"
                min="0"
                max="300"
                value={smartTargetMinutes}
                onChange={(e) => setSmartTargetMinutes(e.target.value)}
                className="modal-input"
                placeholder="Contoh: 60"
              />
            </label>

            <label>
              Strategi Urutan
              <select
                value={smartStrategy}
                onChange={(e) => setSmartStrategy(e.target.value)}
                className="modal-input"
              >
                <option value="balanced">Balanced (default)</option>
                <option value="smooth">Smooth transitions (key + tempo)</option>
                <option value="energy">Energy arc (peak di tengah)</option>
              </select>
            </label>

            {smartPlan && (
              <div className="smart-plan-summary">
                <div><strong>Total estimasi setlist:</strong> {smartPlan.estimatedMinutes} menit</div>
                <div><strong>Blok show utama:</strong> {smartPlan.featuredSongIds.length} lagu (~{smartPlan.featuredMinutes} menit)</div>
                <div className="smart-plan-note">Lagu di luar target tetap dipertahankan sebagai cadangan di urutan akhir.</div>
              </div>
            )}

            {smartError && <div className="error-text">{smartError}</div>}

            <div className="modal-actions">
              <button className="btn" onClick={handleApplySmartSetlist} disabled={smartApplying || !smartPlan}>
                {smartApplying ? 'Menerapkan...' : 'Terapkan Urutan Cerdas'}
              </button>
              <button className="btn btn-secondary" onClick={closeSmartModal} disabled={smartApplying}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Lagu ke Setlist */}
      {showAddSong && canEdit && (
        <div
          className="modal-overlay"
          aria-label="Modal tambah lagu ke setlist"
          onClick={createOverlayDismissHandler(closeAddSongModal)}
          tabIndex={-1}
          onKeyDown={createEscapeDismissHandler(closeAddSongModal)}
        >
          <div
            className="modal add-song-modal"
            role="dialog"
            aria-modal="true"
            tabIndex={0}
          >
            <div className="modal-title">Tambah Lagu ke Setlist</div>
            <input
              ref={addSongInputRef}
              type="text"
              placeholder="Cari judul atau artist..."
              value={addSongSearch}
              onChange={e => setAddSongSearch(e.target.value)}
              className="modal-input modal-input-spaced"
              autoFocus
            />
            <ul className="song-list song-list-scroll modal-list-spaced">
              {filteredAvailableSongs.length === 0 && (
                <li className="info-text">Tidak ada lagu tersedia.</li>
              )}
              {filteredAvailableSongs.map(song => (
                <li
                  key={song.id}
                  className={
                    'song-list-item pointer' + (addingSongIds.includes(song.id) ? ' selected' : '')
                  }
                  onClick={() => {
                    setAddingSongIds(ids => ids.includes(song.id)
                      ? ids.filter(id => id !== song.id)
                      : [...ids, song.id]);
                  }}
                >
                  <span className="modal-item-title">{song.title}</span>
                  <span className="modal-item-meta">{song.artist}</span>
                  {addingSongIds.includes(song.id) && <span className="modal-item-check">✔️</span>}
                </li>
              ))}
            </ul>
            {filteredAvailableSongs.length === 0 && canShowQuickAddSong && (
              <div className="smart-plan-note modal-note-bottom">
                Lagu "{quickAddTitleCandidate}" belum ada di daftar.
                <div className="modal-note-action-wrap">
                  <button
                    className="btn btn-secondary"
                    onClick={handleQuickAddSongFromSetlist}
                    disabled={isQuickAddingSong}
                  >
                    {isQuickAddingSong ? 'Menambahkan...' : `+ Tambah cepat "${quickAddTitleCandidate}"`}
                  </button>
                </div>
              </div>
            )}
            {addSongError && <div className="error-text modal-error-bottom">{addSongError}</div>}
            <div className="modal-inline-actions">
              <button className="btn btn-primary" disabled={isAddingSongs || !addingSongIds.length} onClick={handleAddSongsToSetlist}>
                {isAddingSongs ? 'Menambah...' : `Tambah ${addingSongIds.length ? `(${addingSongIds.length})` : ''}`}
              </button>
              <button className="btn" onClick={closeAddSongModal}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Merge dari Setlist Lain */}
      {showMergeSetlistModal && canEdit && (
        <div
          className="modal-overlay"
          aria-label="Modal merge dari setlist lain"
          onClick={createOverlayDismissHandler(closeMergeSetlistModal)}
          tabIndex={-1}
          onKeyDown={createEscapeDismissHandler(closeMergeSetlistModal)}
        >
          <div
            className="modal add-song-modal"
            role="dialog"
            aria-modal="true"
            tabIndex={0}
          >
            <div className="modal-title">Merge Lagu dari Setlist Lain</div>
            <div className="modal-message modal-message-spaced">
              Pilih satu atau beberapa setlist sumber. Lagu akan ditambahkan ke setlist ini tanpa duplikasi, dan metadata lagu baru juga ikut disalin.
            </div>

            <input
              type="text"
              placeholder="Cari nama setlist atau nama band..."
              value={mergeSetlistSearch}
              onChange={e => setMergeSetlistSearch(e.target.value)}
              className="modal-input modal-input-spaced"
              autoFocus
            />

            <ul className="song-list song-list-scroll modal-list-spaced">
              {mergeCandidateSetlists.length === 0 && (
                <li className="info-text">Tidak ada setlist sumber yang cocok.</li>
              )}
              {mergeCandidateSetlists.map((source) => {
                const sourceSongCount = Array.isArray(source.songs) ? source.songs.length : 0;
                const isSelected = mergeSourceSetlistIds.includes(source.id);
                return (
                  <li
                    key={source.id}
                    className={
                      'song-list-item pointer' + (isSelected ? ' selected' : '')
                    }
                    onClick={() => {
                      setMergeSourceSetlistIds((ids) => ids.includes(source.id)
                        ? ids.filter((id) => id !== source.id)
                        : [...ids, source.id]);
                    }}
                  >
                    <span className="modal-item-title">{source.name}</span>
                    <span className="modal-item-meta">
                      {source.bandName ? `${source.bandName} • ` : ''}{sourceSongCount} lagu
                    </span>
                    {isSelected && <span className="modal-item-check">✔️</span>}
                  </li>
                );
              })}
            </ul>

            {mergeSourceSetlistIds.length > 0 && (
              <div className="smart-plan-note modal-note-bottom">
                {mergeSourceSetlistIds.length} setlist dipilih untuk digabungkan.
              </div>
            )}

            {mergeSetlistError && <div className="error-text modal-error-bottom">{mergeSetlistError}</div>}

            <div className="modal-inline-actions">
              <button className="btn btn-primary" disabled={isMergingSetlist || !mergeSourceSetlistIds.length} onClick={handleMergeFromSetlist}>
                {isMergingSetlist ? 'Menggabungkan...' : `Merge Lagu${mergeSourceSetlistIds.length ? ` (${mergeSourceSetlistIds.length})` : ''}`}
              </button>
              <button className="btn" onClick={closeMergeSetlistModal} disabled={isMergingSetlist}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Detail Lagu di Setlist */}
      {editSongId != null && canEdit && (
        <div
          className="modal-overlay"
          onClick={createOverlayDismissHandler(closeEditSongModal)}
          tabIndex={-1}
          onKeyDown={createEscapeDismissHandler(closeEditSongModal)}
        >
          <div
            className="modal add-song-modal"
            role="dialog"
            aria-modal="true"
            tabIndex={0}
          >
            <div className="modal-title">Edit Detail Lagu di Setlist</div>
            <label>Key
              <input type="text" value={editSongKey} list="song-key-options" onChange={e => setEditSongKey(e.target.value)} className="modal-input modal-input-tight" placeholder="mis. C, Am, F#m" />
              <datalist id="song-key-options">
                {['C','D','E','F','G','A','B'].map(root => [
                  root,
                  `${root}m`,
                  `${root}#`,
                  `${root}#m`,
                  `${root}b`,
                  `${root}bm`,
                ]).flat().map(k => <option key={k} value={k} />)}
              </datalist>
            </label>
            {editSongModalBaseKey && <div className="modal-hint">Key asli lagu: {editSongModalBaseKey}</div>}
            {editSongKeyError && <div className="error-text modal-error-bottom">{editSongKeyError}</div>}
            <label>Tempo
              <input type="text" value={editSongTempo} onChange={e => setEditSongTempo(e.target.value)} className="modal-input modal-input-tight" />
            </label>
            <label>Genre
              <input type="text" value={editSongStyle} onChange={e => setEditSongStyle(e.target.value)} className="modal-input modal-input-tight" />
            </label>
            <button className="btn modal-btn-bottom" onClick={handleEditSongSave}>Simpan</button>
            <button className="btn btn-secondary" onClick={closeEditSongModal}>Batal</button>
          </div>
        </div>
      )}

    </div>
  );
}
