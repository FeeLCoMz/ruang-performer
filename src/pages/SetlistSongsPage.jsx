import React from 'react';
import PlusIcon from '../components/PlusIcon.jsx';
import EditIcon from '../components/EditIcon.jsx';
import DeleteIcon from '../components/DeleteIcon.jsx';
import SetlistPoster from '../components/SetlistPoster.jsx';
import DragHandleIcon from '../components/DragHandleIcon.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import * as authUtils from '../utils/auth.js';
import { cacheSetlist, getSetlist as getSetlistOffline } from '../utils/offlineCache.js';
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS, canEditSetlist } from '../utils/permissionUtils.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import * as chordUtils from '../utils/chordUtils.js';
import { buildSmartSetlistPlan } from '../utils/setlistSmartAssistant.js';
import useMetronome from '../hooks/useMetronome.js';
import YouTubeViewer from '../components/YouTubeViewer.jsx';

const SESSION_DIVIDER_META_FIELD = 'sessionDividerName';

// userBandInfo: bisa array (multi-band) atau object (single band)
export default function SetlistSongsPage({ setlists, songs, setSetlists, setActiveSetlist, loadingSetlists, userBandInfo, performanceMode = false }) {
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
  const [filterArtist, setFilterArtist] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterCompletionStatus, setFilterCompletionStatus] = useState('all');
  const [filterSmartOnly, setFilterSmartOnly] = useState(false);
  const [sortBy, setSortBy] = useState('custom');
  const [sortOrder, setSortOrder] = useState('asc');
  const [groupBy, setGroupBy] = useState('none');

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

  // State untuk konfirmasi hapus
  const [confirmDeleteSongId, setConfirmDeleteSongId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deletingUncompleted, setDeletingUncompleted] = useState(false);
  const [metronomeTempo, setMetronomeTempo] = useState(120);
  const [metronomeSongId, setMetronomeSongId] = useState(null);
  const [isMetronomeActive, setIsMetronomeActive] = useMetronome(false, metronomeTempo);
  const [activeVideoSong, setActiveVideoSong] = useState(null);
  const videoRef = useRef(null);
  const activeInlinePlayerRef = useRef(null);

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
  const allSongsCompleted = localOrder.length > 0 && completedCount === localOrder.length;
  let setlistSongs;
  if (sortBy === 'custom') {
    setlistSongs = (localOrder || []).map((id) => {
      const song = availableSongsPool.find(item => item.id === id);
      const meta = setlistSongMeta[id];
      if (song) {
        if (meta) {
          return {
            ...song,
            key: meta.key || song.key,
            tempo: meta.tempo || song.tempo,
            genre: meta.genre || song.genre
          };
        }
        return song;
      } else {
        // Lagu sudah dihapus dari database
        return {
          id,
          title: '[Lagu dihapus]',
          artist: '',
          key: '',
          tempo: '',
          genre: '',
          deleted: true
        };
      }
    });
  } else {
    setlistSongs = availableSongsPool.filter(song => (localOrder || []).includes(song.id));
  }

  // Extract unique values untuk filter
  const uniqueArtists = useMemo(() => {
    const artists = setlistSongs.map(s => s.artist).filter(Boolean);
    return [...new Set(artists)].sort();
  }, [setlistSongs]);

  const uniqueGenres = useMemo(() => {
    const genres = setlistSongs.map(s => s.genre).filter(Boolean);
    return [...new Set(genres)].sort();
  }, [setlistSongs]);

  // Filter dan sort lagu
  const filteredSongs = useMemo(() => {
    let result = setlistSongs.filter(song => {
      const isCompleted = completedSongs?.[song.id] === true;
      const matchSearch = !searchText || 
        (song.title || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (song.artist || '').toLowerCase().includes(searchText.toLowerCase());
      const matchArtist = !filterArtist || song.artist === filterArtist;
      const matchGenre = !filterGenre || song.genre === filterGenre;
      const matchCompletion = filterCompletionStatus === 'all'
        || (filterCompletionStatus === 'completed' ? isCompleted : !isCompleted);
      const matchSmart = !filterSmartOnly || setlistSongMeta?.[song.id]?.smartFeatured === true;
      return matchSearch && matchArtist && matchGenre && matchCompletion && matchSmart;
    });

    // Sort (skip when custom to preserve manual order)
    if (sortBy !== 'custom') {
      result.sort((a, b) => {
        let aVal, bVal;
        switch (sortBy) {
          case 'title':
            aVal = a.title || '';
            bVal = b.title || '';
            break;
          case 'artist':
            aVal = a.artist || '';
            bVal = b.artist || '';
            break;
          case 'setlistCount':
            aVal = songUsageCountMap.get(a.id) || 0;
            bVal = songUsageCountMap.get(b.id) || 0;
            break;
          case 'completedStatus':
            // Prioritaskan lagu yang sudah dibawakan saat urut naik.
            aVal = completedSongs?.[a.id] === true ? 0 : 1;
            bVal = completedSongs?.[b.id] === true ? 0 : 1;
            break;
          case 'key':
            aVal = a.key || '';
            bVal = b.key || '';
            break;
          case 'tempo':
            aVal = parseInt(a.tempo) || 0;
            bVal = parseInt(b.tempo) || 0;
            break;
          case 'created':
            aVal = new Date(a.createdAt || 0).getTime();
            bVal = new Date(b.createdAt || 0).getTime();
            break;
          default:
            return 0;
        }
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
      });
    }

    return result;
  }, [setlistSongs, songUsageCountMap, completedSongs, searchText, filterArtist, filterGenre, filterCompletionStatus, filterSmartOnly, sortBy, sortOrder, setlistSongMeta]);

  const hasActiveFilters = Boolean(
    searchText || filterArtist || filterGenre || filterSmartOnly || filterCompletionStatus !== 'all'
  );

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

  const filteredSongsWithDividers = useMemo(() => {
    if (sortBy !== 'custom') {
      return filteredSongs.map((song) => ({ type: 'song', song }));
    }

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
  }, [filteredSongs, setlistSongMeta, sortBy]);

  const displayedSongRows = useMemo(() => {
    if (groupBy === 'none') return filteredSongsWithDividers;

    const getGroupLabel = (song) => {
      if (groupBy === 'artist') return (song.artist || '').trim() || 'Tanpa Artis';
      if (groupBy === 'genre') return (song.genre || '').trim() || 'Tanpa Genre';
      if (groupBy === 'key') return (song.key || '').trim() || 'Tanpa Key';
      if (groupBy === 'completion') return completedSongs?.[song.id] === true ? 'Sudah Dibawakan' : 'Belum Dibawakan';
      return 'Lainnya';
    };

    const groups = new Map();
    filteredSongs.forEach((song) => {
      const label = getGroupLabel(song);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(song);
    });

    let labels = Array.from(groups.keys());
    if (groupBy === 'completion') {
      const desired = sortOrder === 'asc'
        ? ['Sudah Dibawakan', 'Belum Dibawakan']
        : ['Belum Dibawakan', 'Sudah Dibawakan'];
      labels = desired.filter((label) => groups.has(label));
    } else {
      labels = labels.sort((a, b) => sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a));
    }

    const rows = [];
    labels.forEach((label) => {
      const songsInGroup = groups.get(label) || [];
      rows.push({
        type: 'group',
        key: `${groupBy}-${label}`,
        label,
        count: songsInGroup.length,
      });
      songsInGroup.forEach((song) => rows.push({ type: 'song', song }));
    });

    return rows;
  }, [groupBy, filteredSongsWithDividers, filteredSongs, completedSongs, sortOrder]);

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

  // Early returns AFTER all hooks
  if (isLoading) return <div className="main-content"><div className="card"><div className="loading-skeleton" style={{height: 40, marginBottom: 16}}></div><div className="loading-skeleton" style={{height: 24, width: '60%', marginBottom: 8}}></div><div className="loading-skeleton" style={{height: 24, width: '40%', marginBottom: 8}}></div></div></div>;
  if (!setlist) return <div className="main-content error-text">Setlist tidak ditemukan atau offline cache kosong</div>;

  function handleClearFilters() {
    setSearchText('');
    setFilterArtist('');
    setFilterGenre('');
    setFilterCompletionStatus('all');
    setFilterSmartOnly(false);
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
        const completedPrefix = completedSongs?.[song.id] === true ? '✅ ' : '';
        if (!includeSongDetails) {
          return `${songNumber}. ${completedPrefix}${song.title}${song.artist ? ` - ${song.artist}` : ''}`;
        }

        const songKey = song.key ? ` [${song.key}]` : '';
        const songTempo = song.tempo ? ` (${song.tempo} BPM)` : '';
        return `${songNumber}. ${completedPrefix}${song.title}${song.artist ? ` - ${song.artist}` : ''}${songKey}${songTempo}`;
      })
      .join('\n')
        .trim();
  }

  const shareText =
    shareFormat === 'title-artist-only'
      ? `${bandText}🎶 Setlist: ${setlist.name}\n\n` +
        `${sessionTitleText}` +
        `${hasSessionDividerInShare ? 'Pembagian sesi:\n' : ''}${formatShareLines(false)}`
      : `${bandText}🎶 Setlist: ${setlist.name}\n\n` +
        `${sessionTitleText}` +
        `${hasSessionDividerInShare ? 'Pembagian sesi:\n' : ''}${formatShareLines(true)}` +
        `\n\nLihat detail & chord: ${shareUrl}`;


  function handleCopyShare() {
    navigator.clipboard.writeText(shareText);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  }

  function handleDownloadPoster() {
    if (!posterRef.current || !setlist) return;
    setIsGeneratingPoster(true);
    setPosterError('');

    const safeName = (setlist.name || 'setlist')
      .replace(/[\/:*?"<>|]+/g, '')
      .trim();

    html2canvas(posterRef.current, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true
    })
      .then((canvas) => {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${safeName || 'setlist'}-poster.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        setPosterError('Gagal membuat poster. Coba lagi.');
        console.error('html2canvas error:', err);
      })
      .finally(() => {
        setIsGeneratingPoster(false);
      });
  }

  function handleDownloadPDF() {
    if (!posterRef.current || !setlist) return;
    setIsGeneratingPoster(true);
    setPosterError('');

    const safeName = (setlist.name || 'setlist')
      .replace(/[\/:*?"<>|]+/g, '')
      .trim();

    html2canvas(posterRef.current, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true
    })
      .then((canvas) => {
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
      })
      .catch((err) => {
        setPosterError('Gagal membuat PDF. Coba lagi.');
        console.error('html2canvas/pdf error:', err);
      })
      .finally(() => {
        setIsGeneratingPoster(false);
      });
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
      console.error('Gagal update status lagu dibawakan', e);
    }
  }

  async function handleMarkAllSongsCompleted() {
    if (!canEdit || !localOrder.length) return;

    const nextCompletedSongs = {};
    for (const songId of localOrder) {
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
      console.error('Gagal menandai semua lagu sebagai dibawakan', e);
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
      console.error('Gagal mereset status lagu dibawakan', e);
    }
  }

  async function handleDeleteUncompletedSongs() {
    if (!canEdit || uncompletedCount === 0) return;

    const confirmed = window.confirm(`Hapus ${uncompletedCount} lagu yang belum ditandai dibawakan dari setlist ini? Lagu hanya dihapus dari setlist, tidak dari daftar lagu.`);
    if (!confirmed) return;

    setDeletingUncompleted(true);
    try {
      const keepSongIdSet = new Set((localOrder || []).filter((songId) => completedSongs[songId] === true));
      const newOrder = (localOrder || []).filter((songId) => keepSongIdSet.has(songId));

      const currentMeta = typeof setlist?.setlistSongMeta === 'object' && !Array.isArray(setlist.setlistSongMeta)
        ? setlist.setlistSongMeta
        : {};
      const nextMeta = {};
      for (const songId of newOrder) {
        if (currentMeta[songId] && typeof currentMeta[songId] === 'object') {
          nextMeta[songId] = { ...currentMeta[songId] };
        }
      }

      const nextCompletedSongs = {};
      for (const songId of newOrder) {
        nextCompletedSongs[songId] = true;
      }

      await persistSetlistSongs(newOrder, nextMeta, nextCompletedSongs);
    } catch (e) {
      console.error('Gagal menghapus lagu yang belum dibawakan', e);
    } finally {
      setDeletingUncompleted(false);
    }
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
    setActiveVideoSong(song);
  }

  function handleCloseVideoPlayer() {
    if (videoRef.current && typeof videoRef.current.handlePause === 'function') {
      videoRef.current.handlePause();
    }
    setActiveVideoSong(null);
  }

  function isSongPlaying(songId) {
    if (isMetronomeActive && metronomeSongId === songId) return true;
    if (activeVideoSong?.id === songId) return true;
    return false;
  }

  return (
    <div className={`page-container${performanceMode ? ' performance-mode' : ''}`}>  {/* Tambah class jika performanceMode */}
      <div className="page-header">
        <div>
          <h1>📋 {setlist.name}</h1>
          {setlist.bandName && (
            <div className="setlist-band-name">🎸 {setlist.bandName}</div>
          )}
          {setlist.description && (
            <div className="setlist-description">{setlist.description}</div>
          )}
          <p>{setlistSongs.length} lagu di setlist ini</p>
          <p>✅ {completedCount} lagu sudah dibawakan</p>
          {featuredSongIdsFromMeta.length > 0 && (
            <div className="smart-featured-caption">
              ✨ {featuredSongIdsFromMeta.length} lagu ditandai sebagai blok show utama Smart Assistant
            </div>
          )}
        </div>
        <div className="setlist-header-actions setlist-header-actions-compact">
          {!performanceMode && (
            <div className="setlist-header-action-group setlist-header-primary-group" aria-label="Aksi utama setlist">
              {canEdit && (
                <button className="btn setlist-btn-primary" onClick={() => setShowAddSong(true)} title="Tambah Lagu ke Setlist">
                  <span className="setlist-btn-icon" aria-hidden="true"><PlusIcon size={22} /></span>
                  <span className="setlist-btn-label">Tambah Lagu</span>
                </button>
              )}
              {canEdit && (
                <button className="btn btn-secondary setlist-btn-secondary setlist-btn-mobile-icon" onClick={openMergeSetlistModal} title="Merge lagu dari setlist lain">
                  <span className="setlist-btn-icon" aria-hidden="true">🔀</span>
                  <span className="setlist-btn-label">Merge Setlist</span>
                </button>
              )}
              <button
                className="btn setlist-btn-secondary setlist-btn-mobile-icon"
                onClick={() => {
                  setShareSessionFilter('all');
                  setShowShareModal(true);
                }}
                title="Bagikan Setlist"
              >
                <span className="setlist-btn-icon" aria-hidden="true">📤</span>
                <span className="setlist-btn-label">Bagikan</span>
              </button>
            </div>
          )}

          {canEdit && (
            <div className="setlist-header-action-group setlist-header-progress-group" aria-label="Aksi progres performa">
              {localOrder.length > 0 && !allSongsCompleted && (
                <button className="btn btn-secondary setlist-btn-ghost" onClick={handleMarkAllSongsCompleted} title="Tandai semua lagu sudah dibawakan">
                  ✅ Tandai Semua
                </button>
              )}
              {completedCount > 0 && (
                <button className="btn btn-secondary setlist-btn-ghost" onClick={handleResetCompletedSongs} title="Reset semua status lagu dibawakan">
                  ↺ Reset Dibawakan
                </button>
              )}
              {uncompletedCount > 0 && (
                <details className="setlist-inline-more" aria-label="Aksi progres tambahan">
                  <summary className="btn btn-secondary setlist-btn-ghost">⋯</summary>
                  <div className="setlist-inline-more-menu">
                    <button
                      className="btn btn-red setlist-btn-danger"
                      onClick={handleDeleteUncompletedSongs}
                      title="Hapus lagu yang belum ditandai dibawakan dari setlist ini saja"
                      disabled={deletingUncompleted}
                    >
                      {deletingUncompleted ? 'Menghapus...' : '🗑 Hapus Belum Dibawakan'}
                    </button>
                  </div>
                </details>
              )}
            </div>
          )}

          {!performanceMode && (
            <details className="setlist-header-more" aria-label="Aksi tambahan setlist">
              <summary className="btn btn-secondary">⚙ Aksi Lainnya</summary>
              <div className="setlist-header-more-menu">
                {canEdit && (
                  <button className="btn setlist-btn-ghost" onClick={() => setShowSmartModal(true)} title="Urutkan otomatis berdasarkan key, tempo, energi, dan durasi">
                    ✨ Smart Assistant
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
                {canEdit && (
                  <button className="btn btn-secondary setlist-btn-ghost" onClick={openAddSessionDivider} title="Tambah divider sesi">
                    🧩 Divider Sesi
                  </button>
                )}
                <button className="btn setlist-btn-ghost" onClick={() => setShowCopyModal(true)} title="Copy Setlist">
                  📋 Copy Setlist
                </button>
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Filter dan Search Bar */}
      {/* Filter dan Search Bar, sembunyikan di performanceMode */}
      {!performanceMode && (
        <div className="filter-container">
          <input
            type="text"
            placeholder="🔍 Cari judul atau artis..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input-main"
          />
          <div className="filter-row">
            <select
              value={filterArtist}
              onChange={(e) => setFilterArtist(e.target.value)}
              className="filter-select"
            >
              <option value="">Artis: Semua</option>
              {uniqueArtists.map(artist => (
                <option key={artist} value={artist}>{artist}</option>
              ))}
            </select>
            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="filter-select"
            >
              <option value="">Genre: Semua</option>
              {uniqueGenres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
            <select
              value={filterCompletionStatus}
              onChange={(e) => setFilterCompletionStatus(e.target.value)}
              className="filter-select"
              aria-label="Filter status dibawakan"
            >
              <option value="all">Dibawakan: Semua</option>
              <option value="completed">Dibawakan: Sudah</option>
              <option value="pending">Dibawakan: Belum</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="custom">Urutkan: Custom</option>
              <option value="title">Urutkan: Judul</option>
              <option value="artist">Urutkan: Artis</option>
              <option value="completedStatus">Urutkan: Sudah Dibawakan</option>
              <option value="setlistCount">Urutkan: Jumlah Setlist</option>
              <option value="key">Urutkan: Kunci</option>
              <option value="tempo">Urutkan: Tempo</option>
              <option value="created">Urutkan: Tanggal</option>
            </select>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="filter-select"
              aria-label="Kelompokkan daftar lagu"
            >
              <option value="none">Kelompokkan: Tidak</option>
              <option value="artist">Kelompokkan: Artis</option>
              <option value="genre">Kelompokkan: Genre</option>
              <option value="key">Kelompokkan: Key</option>
              <option value="completion">Kelompokkan: Dibawakan</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary"
              title={
                sortBy === 'completedStatus'
                  ? (sortOrder === 'asc' ? 'Sudah ke Belum' : 'Belum ke Sudah')
                  : (sortOrder === 'asc' ? 'Urut Naik' : 'Urut Turun')
              }
            >
              {sortBy === 'completedStatus'
                ? (sortOrder === 'asc' ? '↑ Sudah→Belum' : '↓ Belum→Sudah')
                : (sortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A')}
            </button>
            {featuredSongIdsFromMeta.length > 0 && (
              <button
                onClick={() => setFilterSmartOnly(v => !v)}
                className={`btn ${filterSmartOnly ? '' : 'btn-secondary'}`}
                title="Filter lagu Smart Pick"
              >
                {filterSmartOnly ? '✨ Smart Pick Saja (Aktif)' : '✨ Smart Pick Saja'}
              </button>
            )}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="btn btn-secondary"
              >
                ✕ Reset
              </button>
            )}
          </div>
        </div>
      )}

      {filteredSongs.length === 0 ? (
        <div className="empty-state">
          <p>
            {hasActiveFilters ? 'Tidak ada lagu yang cocok dengan filter' : 'Setlist ini belum berisi lagu'}
          </p>
          {!performanceMode && !hasActiveFilters && setlistSongs.length === 0 && (
            <button className="btn" onClick={() => setShowAddSong(true)} style={{ marginTop: '12px' }}>
              <PlusIcon size={18} /> Tambah Lagu Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="song-list-container">
          {displayedSongRows.map((row) => {
            if (row.type === 'group') {
              return (
                <div key={row.key} className="setlist-group-header">
                  <span className="setlist-group-title">{row.label}</span>
                  <span className="setlist-group-count">{row.count} lagu</span>
                </div>
              );
            }

            if (row.type === 'divider') {
              return (
                <div
                  key={`divider-${row.songId}`}
                  className="setlist-session-divider"
                  draggable={sortBy === 'custom' && groupBy === 'none' && canEdit}
                  onDragStart={e => {
                    if (sortBy !== 'custom' || groupBy !== 'none' || !canEdit) return;
                    e.dataTransfer.setData('drag-type', 'session-divider');
                    e.dataTransfer.setData('divider-from-song-id', String(row.songId));
                    e.currentTarget.classList.add('dragging');
                  }}
                  onDragEnd={e => {
                    e.currentTarget.classList.remove('dragging');
                  }}
                  onDragOver={e => {
                    if (sortBy !== 'custom' || groupBy !== 'none' || !canEdit) return;
                    if (e.dataTransfer.getData('drag-type') !== 'session-divider') return;
                    e.preventDefault();
                    e.currentTarget.classList.add('drag-over');
                  }}
                  onDragLeave={e => {
                    e.currentTarget.classList.remove('drag-over');
                  }}
                  onDrop={e => {
                    if (sortBy !== 'custom' || groupBy !== 'none' || !canEdit) return;
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-over');
                    const dragType = e.dataTransfer.getData('drag-type');
                    if (dragType !== 'session-divider') return;
                    const fromSongId = e.dataTransfer.getData('divider-from-song-id');
                    handleMoveSessionDivider(fromSongId, row.songId);
                  }}
                >
                  <div className="setlist-session-divider-title">🧩 {row.name}</div>
                  {!performanceMode && canEdit && (
                    <div className="setlist-session-divider-actions">
                      <button
                        onClick={() => openEditSessionDivider(row.songId)}
                        className="btn btn-secondary"
                        title="Edit divider sesi"
                      >
                        <EditIcon size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteSessionDivider(row.songId)}
                        className="btn btn-red"
                        title="Hapus divider sesi"
                      >
                        <DeleteIcon size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            const song = row.song;
            const idx = filteredSongs.findIndex(item => item.id === song.id);
            const customIdx = localOrder.indexOf(song.id);
            const baseSong = baseSongMap.get(song.id);
            const keyChanged = baseSong && song.key && baseSong.key && song.key !== baseSong.key;
            const tempoChanged = baseSong && song.tempo && baseSong.tempo && song.tempo !== baseSong.tempo;
            const genreChanged = baseSong && song.genre && baseSong.genre && song.genre !== baseSong.genre;
            const isSmartFeatured = setlistSongMeta?.[song.id]?.smartFeatured === true;
            const isCompleted = completedSongs?.[song.id] === true;
            const isInlinePlayerSong = (activeVideoSong?.id === song.id) || (isMetronomeActive && metronomeSongId === song.id);
            return (
              <React.Fragment key={song.id}>
                <div
                  className={`song-item${isSmartFeatured ? ' song-item-smart-featured' : ''}${isCompleted ? ' song-item-completed' : ''}${isSongPlaying(song.id) ? ' song-item-playing' : ''}`}
                  draggable={sortBy === 'custom' && groupBy === 'none'}
                  onDragStart={e => {
                    if (sortBy !== 'custom' || groupBy !== 'none') return;
                    e.dataTransfer.setData('song-idx', String(customIdx));
                    e.currentTarget.classList.add('dragging');
                  }}
                  onDragEnd={e => {
                    e.currentTarget.classList.remove('dragging');
                  }}
                  onDragOver={e => {
                    if (sortBy !== 'custom' || groupBy !== 'none') return;
                    e.preventDefault();
                    e.currentTarget.classList.add('drag-over');
                  }}
                  onDragLeave={e => {
                    e.currentTarget.classList.remove('drag-over');
                  }}
                  onDrop={e => {
                    if (sortBy !== 'custom' || groupBy !== 'none') return;
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-over');
                    const dragType = e.dataTransfer.getData('drag-type');
                    if (dragType === 'session-divider') {
                      const fromSongId = e.dataTransfer.getData('divider-from-song-id');
                      handleMoveSessionDivider(fromSongId, song.id);
                      return;
                    }
                    const fromIdx = Number(e.dataTransfer.getData('song-idx'));
                    const toIdx = customIdx;
                    if (fromIdx !== toIdx) handleReorder(fromIdx, toIdx);
                  }}
                  onClick={() => navigate(`/setlists/${setlist.id}/songs/${song.id}`, {
                    state: {
                      setlistId: setlist.id,
                      setlist: { ...setlist, songs: setlistSongs },
                      setlistSong: song
                    }
                  })}
                >
                  {/* Drag handle icon */}
                  {sortBy === 'custom' && groupBy === 'none' && (
                    <span className="drag-handle-icon" title="Seret untuk mengatur urutan">
                      <DragHandleIcon size={18} />
                    </span>
                  )}
                  {/* Song Info */}
                  <div className="song-info">
                    <div className="song-number">{idx + 1}.</div>
                    <h3 className="song-title">
                      {song.title}
                      {isCompleted && <span className="song-completed-badge" title="Sudah dibawakan" aria-label="Sudah dibawakan">✓</span>}
                      {isSmartFeatured && <span className="smart-featured-badge">Smart Pick</span>}
                      {isSongPlaying(song.id) && <span className="song-playing-badge">LIVE</span>}
                    </h3>
                    <div className="song-meta">
                      {song.artist && <span>👤 {song.artist}</span>}
                      {song.key && (
                        <span>
                          🎹 {song.key}
                          {keyChanged && baseSong?.key ? ` (${baseSong.key})` : ''}
                        </span>
                      )}
                      {song.tempo && (
                        <span>
                          ⏱️ {song.tempo} BPM
                          {tempoChanged && baseSong?.tempo ? ` (${baseSong.tempo} BPM)` : ''}
                        </span>
                      )}
                      {song.genre && (
                        <span>
                          🎸 {song.genre}
                          {genreChanged && baseSong?.genre ? ` (${baseSong.genre})` : ''}
                        </span>
                      )}
                      <span>📋 {songUsageCountMap.get(song.id) || 0} setlist</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="song-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => handleToggleMetronome(song, e)}
                      className="btn btn-secondary song-action-mini"
                      title="Play metronom"
                      aria-label={isMetronomeActive && metronomeSongId === song.id ? 'Stop metronom' : 'Start metronom'}
                    >
                      {isMetronomeActive && metronomeSongId === song.id ? '⏹' : '⏱'}
                    </button>
                    {hasYouTubeVideo(song) && (
                      <button
                        onClick={(e) => handlePlayVideo(song, e)}
                        className="btn btn-secondary song-action-mini"
                        title="Play video"
                        aria-label="Play video"
                      >
                        🎬
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => handleToggleSongCompleted(song.id)}
                        className={`btn song-action-mini ${isCompleted ? '' : 'btn-secondary'}`}
                        title={isCompleted ? 'Tandai belum dibawakan' : 'Tandai sudah dibawakan'}
                        aria-label={isCompleted ? 'Tandai belum dibawakan' : 'Tandai sudah dibawakan'}
                      >
                        {isCompleted ? '✅' : '☑'}
                      </button>
                    )}
                    {!performanceMode && canEdit && (
                      <>
                        <button
                          onClick={() => openEditSong(song.id)}
                          className="btn"
                          title="Edit detail lagu di setlist"
                        >
                          <EditIcon size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteSongFromSetlist(song.id)}
                          className="btn btn-red"
                          title="Hapus dari setlist"
                        >
                          <DeleteIcon size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

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
                          <button className="btn btn-secondary" aria-label="Tutup video" onClick={handleCloseVideoPlayer}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    {activeVideoSong?.id === song.id && (
                      <div className="song-inline-player-video">
                        <YouTubeViewer
                          ref={videoRef}
                          videoId={song.youtubeId || song.youtube_url}
                        />
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Modal Divider Sesi */}
      {showSessionDividerModal && canEdit && !performanceMode && (
        <div
          className="modal-overlay"
          aria-label="Modal divider sesi"
          onClick={e => { if (e.target.classList.contains('modal-overlay')) setShowSessionDividerModal(false); }}
          tabIndex={-1}
          onKeyDown={e => { if (e.key === 'Escape') setShowSessionDividerModal(false); }}
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
              <div className="smart-plan-note" style={{ marginTop: 8 }}>
                Divider aktif: {sessionDividers.map(d => d.name).join(', ')}
              </div>
            )}
            {sessionDividerError && <div className="error-text" style={{ marginTop: 8 }}>{sessionDividerError}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={handleSaveSessionDivider} disabled={isSavingSessionDivider}>
                {isSavingSessionDivider ? 'Menyimpan...' : 'Simpan Divider'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowSessionDividerModal(false)} disabled={isSavingSessionDivider}>
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
          onClick={e => { if (e.target.classList.contains('modal-overlay')) setShowShareModal(false); }}
          tabIndex={-1}
          onKeyDown={e => { if (e.key === 'Escape') setShowShareModal(false); }}
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
                <option value="full">Format lengkap (judul, penyanyi, key, tempo, link)</option>
                <option value="title-artist-only">Hanya judul lagu + penyanyi</option>
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
              <button className="btn " onClick={handleCopyShare}>
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
              <button className="btn btn-secondary" onClick={() => setShowShareModal(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Copy Setlist */}
      {showCopyModal && (
        <div
          className="modal-overlay"
          aria-label="Modal copy setlist"
          onClick={e => { if (e.target.classList.contains('modal-overlay')) setShowCopyModal(false); }}
          tabIndex={-1}
          onKeyDown={e => { if (e.key === 'Escape') setShowCopyModal(false); }}
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
      {showSmartModal && canEdit && !performanceMode && (
        <div
          className="modal-overlay"
          aria-label="Modal smart setlist assistant"
          onClick={e => { if (e.target.classList.contains('modal-overlay')) setShowSmartModal(false); }}
          tabIndex={-1}
          onKeyDown={e => { if (e.key === 'Escape') setShowSmartModal(false); }}
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
              <button className="btn btn-secondary" onClick={() => setShowSmartModal(false)} disabled={smartApplying}>
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
          onClick={e => { if (e.target.classList.contains('modal-overlay')) setShowAddSong(false); }}
          tabIndex={-1}
          onKeyDown={e => { if (e.key === 'Escape') setShowAddSong(false); }}
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
              className="modal-input"
              style={{ marginBottom: 12 }}
              autoFocus
            />
            <ul className="song-list song-list-scroll" style={{ marginBottom: 8 }}>
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
                  style={addingSongIds.includes(song.id) ? { background: 'var(--primary-accent, #e0e7ff)' } : undefined}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary, #3730a3)' }}>{song.title}</span> <span style={{ color: 'var(--text-muted, #888)', marginLeft: 8 }}>{song.artist}</span>
                  {addingSongIds.includes(song.id) && <span style={{ marginLeft: 8 }}>✔️</span>}
                </li>
              ))}
            </ul>
            {filteredAvailableSongs.length === 0 && canShowQuickAddSong && (
              <div className="smart-plan-note" style={{ marginBottom: 8 }}>
                Lagu "{quickAddTitleCandidate}" belum ada di daftar.
                <div style={{ marginTop: 8 }}>
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
            {addSongError && <div className="error-text" style={{ marginBottom: 8 }}>{addSongError}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" disabled={isAddingSongs || !addingSongIds.length} onClick={handleAddSongsToSetlist}>
                {isAddingSongs ? 'Menambah...' : `Tambah ${addingSongIds.length ? `(${addingSongIds.length})` : ''}`}
              </button>
              <button className="btn" onClick={() => setShowAddSong(false)}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Merge dari Setlist Lain */}
      {showMergeSetlistModal && canEdit && (
        <div
          className="modal-overlay"
          aria-label="Modal merge dari setlist lain"
          onClick={e => { if (e.target.classList.contains('modal-overlay')) setShowMergeSetlistModal(false); }}
          tabIndex={-1}
          onKeyDown={e => { if (e.key === 'Escape') setShowMergeSetlistModal(false); }}
        >
          <div
            className="modal add-song-modal"
            role="dialog"
            aria-modal="true"
            tabIndex={0}
          >
            <div className="modal-title">Merge Lagu dari Setlist Lain</div>
            <div className="modal-message" style={{ marginBottom: 10 }}>
              Pilih satu atau beberapa setlist sumber. Lagu akan ditambahkan ke setlist ini tanpa duplikasi, dan metadata lagu baru juga ikut disalin.
            </div>

            <input
              type="text"
              placeholder="Cari nama setlist atau nama band..."
              value={mergeSetlistSearch}
              onChange={e => setMergeSetlistSearch(e.target.value)}
              className="modal-input"
              style={{ marginBottom: 10 }}
              autoFocus
            />

            <ul className="song-list song-list-scroll" style={{ marginBottom: 8 }}>
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
                    style={isSelected ? { background: 'var(--primary-accent, #e0e7ff)' } : undefined}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--text-primary, #3730a3)' }}>{source.name}</span>
                    <span style={{ color: 'var(--text-muted, #888)', marginLeft: 8 }}>
                      {source.bandName ? `${source.bandName} • ` : ''}{sourceSongCount} lagu
                    </span>
                    {isSelected && <span style={{ marginLeft: 8 }}>✔️</span>}
                  </li>
                );
              })}
            </ul>

            {mergeSourceSetlistIds.length > 0 && (
              <div className="smart-plan-note" style={{ marginBottom: 8 }}>
                {mergeSourceSetlistIds.length} setlist dipilih untuk digabungkan.
              </div>
            )}

            {mergeSetlistError && <div className="error-text" style={{ marginBottom: 8 }}>{mergeSetlistError}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" disabled={isMergingSetlist || !mergeSourceSetlistIds.length} onClick={handleMergeFromSetlist}>
                {isMergingSetlist ? 'Menggabungkan...' : `Merge Lagu${mergeSourceSetlistIds.length ? ` (${mergeSourceSetlistIds.length})` : ''}`}
              </button>
              <button className="btn" onClick={() => setShowMergeSetlistModal(false)} disabled={isMergingSetlist}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Detail Lagu di Setlist */}
      {editSongId != null && canEdit && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target.classList.contains('modal-overlay')) setEditSongId(null); }}
          tabIndex={-1}
          onKeyDown={e => { if (e.key === 'Escape') setEditSongId(null); }}
        >
          <div
            className="modal add-song-modal"
            role="dialog"
            aria-modal="true"
            tabIndex={0}
          >
            <div className="modal-title">Edit Detail Lagu di Setlist</div>
            <label>Key
              <input type="text" value={editSongKey} onChange={e => setEditSongKey(e.target.value)} className="modal-input" style={{ marginBottom: 8 }} />
            </label>
            {editSongKeyError && <div className="error-text" style={{ marginBottom: 8 }}>{editSongKeyError}</div>}
            <label>Tempo
              <input type="text" value={editSongTempo} onChange={e => setEditSongTempo(e.target.value)} className="modal-input" style={{ marginBottom: 8 }} />
            </label>
            <label>Genre
              <input type="text" value={editSongStyle} onChange={e => setEditSongStyle(e.target.value)} className="modal-input" style={{ marginBottom: 8 }} />
            </label>
            <button className="btn " style={{ marginBottom: 8 }} onClick={handleEditSongSave}>Simpan</button>
            <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => setEditSongId(null)}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
