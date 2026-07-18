
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { canPerformAction, PERMISSIONS } from '../utils/permissionUtils.js';
import PlusIcon from '../components/PlusIcon.jsx';
import EditIcon from '../components/EditIcon.jsx';
import DeleteIcon from '../components/DeleteIcon.jsx';
import YouTubeViewer from '../components/YouTubeViewer.jsx';
import { SongListSkeleton } from '../components/LoadingSkeleton.jsx';
import { fetchSetLists, fetchBands, updateSongMastery } from '../apiClient.js';
import VoiceSearchButton from '../components/VoiceSearchButton.jsx';
import { updatePageMeta, pageMetadata } from '../utils/metaTagsUtil.js';
import useMetronome from '../hooks/useMetronome.js';
import { List as VirtualList } from 'react-window';

function VirtualSongRow({ index, style, ariaAttributes, songs, renderSongItem }) {
  const song = songs[index];
  if (!song) return null;

  return (
    <div
      style={style}
      className="song-virtual-row"
      {...ariaAttributes}
    >
      {renderSongItem(song, {
        height: '100%',
        margin: 0,
      })}
    </div>
  );
}

export default function SongListPage({ songs, loading, error, onSongClick, onSongMasteryUpdated, performanceMode = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.userId || user?.id;
  const pageSize = performanceMode ? 120 : 60;
  // Restore state from localStorage
  const getPersistedState = () => {
    try {
      const raw = localStorage.getItem('songListPageState');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const persisted = getPersistedState();
  const [search, setSearch] = useState(persisted.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(persisted.search || '');
  const [setlists, setSetlists] = useState([]);
  const [bands, setBands] = useState([]);
  const [setlistsLoading, setSetlistsLoading] = useState(true);
  const [filterArtist, setFilterArtist] = useState(persisted.filterArtist || 'all');
  const [filterKey, setFilterKey] = useState(persisted.filterKey || 'all');
  const [filterGenre, setFilterGenre] = useState(persisted.filterGenre || 'all');
  const [filterBand, setFilterBand] = useState(persisted.filterBand || 'all');
  const [filterSetlist, setFilterSetlist] = useState(persisted.filterSetlist || 'all');
  const [sortBy, setSortBy] = useState(persisted.sortBy || 'updated');
  const [sortOrder, setSortOrder] = useState(persisted.sortOrder || 'desc');
  const [groupBy, setGroupBy] = useState(persisted.groupBy || 'none');
  const [masteryFilter, setMasteryFilter] = useState(persisted.masteryFilter || (persisted.showOnlyMastered ? 'mastered' : 'all'));
  const [metronomeTempo, setMetronomeTempo] = useState(120);
  const [metronomeSongId, setMetronomeSongId] = useState(null);
  const [isMetronomeActive, setIsMetronomeActive] = useMetronome(false, metronomeTempo);
  const [activeVideoSong, setActiveVideoSong] = useState(null);
  const [updatingMasterySongId, setUpdatingMasterySongId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [isNarrowViewport, setIsNarrowViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });
  const videoRef = useRef(null);
  const activeInlinePlayerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onResize = () => {
      setIsNarrowViewport(window.innerWidth < 768);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state = {
      search,
      filterArtist,
      filterKey,
      filterGenre,
      filterBand,
      filterSetlist,
      sortBy,
      sortOrder,
      groupBy,
      masteryFilter,
    };
    localStorage.setItem('songListPageState', JSON.stringify(state));
  }, [search, filterArtist, filterKey, filterGenre, filterBand, filterSetlist, sortBy, sortOrder, groupBy, masteryFilter]);

  useEffect(() => {
    updatePageMeta(pageMetadata.songs);
    // Fetch setlists for song usage count and fetch bands for filter options.
    let mounted = true;
    setSetlistsLoading(true);
    Promise.allSettled([fetchSetLists(), fetchBands()])
      .then(([setlistsResult, bandsResult]) => {
        if (!mounted) return;

        if (setlistsResult.status === 'fulfilled') {
          setSetlists(setlistsResult.value || []);
        } else {
          setSetlists([]);
        }

        if (bandsResult.status === 'fulfilled') {
          setBands(Array.isArray(bandsResult.value) ? bandsResult.value : []);
        } else {
          setBands([]);
        }
      })
      .finally(() => { if (mounted) setSetlistsLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Extract unique values for filters
  const { artists, keys, genres } = useMemo(() => {
    const artistSet = new Set();
    const keySet = new Set();
    const genreSet = new Set();

    songs.forEach(song => {
      if (song.artist) artistSet.add(song.artist);
      if (song.key) keySet.add(song.key);
      if (song.genre) genreSet.add(song.genre);
    });

    return {
      artists: Array.from(artistSet).sort(),
      keys: Array.from(keySet).sort(),
      genres: Array.from(genreSet).sort()
    };
  }, [songs]);

  const bandOptions = useMemo(() => {
    const map = new Map();

    bands.forEach((band) => {
      if (!band?.id) return;
      map.set(String(band.id), band.name || `Band ${band.id}`);
    });

    songs.forEach((song) => {
      if (!song?.bandId) return;
      const songBandId = String(song.bandId);
      if (!map.has(songBandId)) {
        map.set(songBandId, song.bandName || `Band ${song.bandId}`);
      }
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bands, songs]);

  // Extract setlist options for filter
  const setlistOptions = useMemo(() => {
    if (!Array.isArray(setlists)) return [];
    return setlists.map(sl => ({ id: sl.id, name: sl.name || `Setlist ${sl.id}` }));
  }, [setlists]);

  // Filter and sort songs
  const filteredSongs = useMemo(() => {
    let result = [...songs];

    // Apply search
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(song =>
        song.title?.toLowerCase().includes(searchLower) ||
        song.artist?.toLowerCase().includes(searchLower) ||
        song.genre?.toLowerCase().includes(searchLower)
      );
    }

    // Apply filters
    if (filterArtist !== 'all') {
      result = result.filter(song => song.artist === filterArtist);
    }
    if (filterKey !== 'all') {
      result = result.filter(song => song.key === filterKey);
    }
    if (filterGenre !== 'all') {
      result = result.filter(song => song.genre === filterGenre);
    }
    if (filterBand !== 'all') {
      result = result.filter(song => String(song.bandId || '') === String(filterBand));
    }
    if (filterSetlist !== 'all') {
      // Cari setlist yang dipilih
      const selectedSetlist = setlists.find(sl => String(sl.id) === String(filterSetlist));
      if (selectedSetlist && Array.isArray(selectedSetlist.songs)) {
        const songIds = new Set(selectedSetlist.songs);
        result = result.filter(song => songIds.has(song.id));
      } else {
        result = [];
      }
    }

    if (masteryFilter === 'mastered') {
      result = result.filter((song) => Boolean(song?.isMasteredByCurrentUser));
    } else if (masteryFilter === 'unmastered') {
      result = result.filter((song) => !song?.isMasteredByCurrentUser);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'title':
          aVal = a.title?.toLowerCase() || '';
          bVal = b.title?.toLowerCase() || '';
          break;
        case 'artist':
          aVal = a.artist?.toLowerCase() || '';
          bVal = b.artist?.toLowerCase() || '';
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
        case 'updated':
          aVal = new Date(a.updatedAt || a.createdAt || 0).getTime();
          bVal = new Date(b.updatedAt || b.createdAt || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [songs, debouncedSearch, filterArtist, filterKey, filterGenre, filterBand, filterSetlist, setlists, masteryFilter, sortBy, sortOrder]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [debouncedSearch, filterArtist, filterKey, filterGenre, filterBand, filterSetlist, masteryFilter, sortBy, sortOrder, groupBy, pageSize]);

  const handleClearFilters = () => {
    setSearch('');
    setFilterArtist('all');
    setFilterKey('all');
    setFilterGenre('all');
    setFilterBand('all');
    setFilterSetlist('all');
    setSortBy('updated');
    setSortOrder('desc');
    setGroupBy('none');
    setMasteryFilter('all');
  };

  const hasActiveFilters = search || filterArtist !== 'all' || filterKey !== 'all' || filterGenre !== 'all' || filterBand !== 'all' || filterSetlist !== 'all' || masteryFilter !== 'all' || groupBy !== 'none';

  // Optimized: Build a map of songId -> count of setlists using it
  const songSetlistCountMap = useMemo(() => {
    const map = {};
    if (Array.isArray(setlists)) {
      setlists.forEach(sl => {
        if (Array.isArray(sl.songs)) {
          sl.songs.forEach(songId => {
            map[songId] = (map[songId] || 0) + 1;
          });
        }
      });
    }
    return map;
  }, [setlists]);

  // Helper: get count from map
  function getSetlistCount(songId) {
    return songSetlistCountMap[songId] || 0;
  }

  const permissionsBySongId = useMemo(() => {
    const map = {};
    filteredSongs.forEach((song) => {
      if (!song?.id) return;

      let canEdit = false;
      let canDelete = false;
      let canDuplicate = false;

      if (song.userId) {
        canEdit = canPerformAction(
          user,
          song.bandId || null,
          { role: user?.role || 'member', bandId: song.bandId || null },
          PERMISSIONS.SONG_EDIT
        ) || song.userId === currentUserId;

        canDuplicate = canPerformAction(
          user,
          song.bandId || null,
          { role: user?.role || 'member', bandId: song.bandId || null },
          PERMISSIONS.SONG_CREATE
        ) || canEdit;

        const isContributor = song.userId === currentUserId;
        const notInAnySetlist = getSetlistCount(song.id) === 0;
        canDelete = (
          canPerformAction(
            user,
            song.bandId || null,
            { role: user?.role || 'member', bandId: song.bandId || null },
            PERMISSIONS.SONG_DELETE
          ) && isContributor
        ) || (isContributor && notInAnySetlist);
      }

      map[song.id] = { canEdit, canDelete, canDuplicate };
    });
    return map;
  }, [filteredSongs, user, currentUserId, songSetlistCountMap]);

  const visibleSongs = useMemo(() => {
    return filteredSongs.slice(0, visibleCount);
  }, [filteredSongs, visibleCount]);

  const displayedSongRows = useMemo(() => {
    if (groupBy === 'none') return visibleSongs.map((song) => ({ type: 'song', song }));

    const getGroupLabel = (song) => {
      if (groupBy === 'artist') return (song.artist || '').trim() || 'Tanpa Artis';
      if (groupBy === 'genre') return (song.genre || '').trim() || 'Tanpa Genre';
      if (groupBy === 'key') return (song.key || '').trim() || 'Tanpa Kunci';
      if (groupBy === 'band') return song.bandName || (song.bandId ? `Band ${song.bandId}` : 'Personal');
      if (groupBy === 'mastery') return song.isMasteredByCurrentUser ? 'Sudah Dikuasai' : 'Belum Kuasai';
      return 'Lainnya';
    };

    const groups = new Map();
    visibleSongs.forEach((song) => {
      const label = getGroupLabel(song);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(song);
    });

    let labels = Array.from(groups.keys());
    if (groupBy === 'mastery') {
      const desired = sortOrder === 'asc' ? ['Sudah Dikuasai', 'Belum Kuasai'] : ['Belum Kuasai', 'Sudah Dikuasai'];
      labels = desired.filter((label) => groups.has(label));
    } else {
      labels = labels.sort((a, b) => sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a));
    }

    const rows = [];
    labels.forEach((label) => {
      const songsInGroup = groups.get(label) || [];
      rows.push({ type: 'group', key: `${groupBy}-${label}`, label, count: songsInGroup.length });
      songsInGroup.forEach((song) => rows.push({ type: 'song', song }));
    });
    return rows;
  }, [groupBy, visibleSongs, sortOrder]);

  const hiddenSongsCount = Math.max(filteredSongs.length - visibleSongs.length, 0);

  const masteredStats = useMemo(() => {
    const masteredAllCount = songs.filter((song) => Boolean(song?.isMasteredByCurrentUser)).length;
    const masteredFilteredCount = filteredSongs.filter((song) => Boolean(song?.isMasteredByCurrentUser)).length;

    const totalSongs = songs.length;
    const masteredPercent = totalSongs > 0 ? Math.round((masteredAllCount / totalSongs) * 100) : 0;

    return {
      masteredAllCount,
      masteredFilteredCount,
      totalSongs,
      masteredPercent,
    };
  }, [songs, filteredSongs]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>🎵 Lagu Saya</h1>
        </div>
        <SongListSkeleton count={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>🎵 Lagu Saya</h1>
        </div>
        <div className="error-text">{error}</div>
      </div>
    );
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

  function isSongPlaying(songId) {
    if (isMetronomeActive && metronomeSongId === songId) return true;
    if (activeVideoSong?.id === songId) return true;
    return false;
  }

  function handleCloseVideoPlayer() {
    if (videoRef.current && typeof videoRef.current.handlePause === 'function') {
      videoRef.current.handlePause();
    }
    setActiveVideoSong(null);
  }

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
    if (activeVideoSong && !hasYouTubeVideo(activeVideoSong)) {
      setActiveVideoSong(null);
    }
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
    if (activeVideoSong && !isMetronomeActive && metronomeSongId === activeVideoSong.id) {
      setMetronomeSongId(null);
    }
  }, [activeVideoSong, isMetronomeActive, metronomeSongId]);

  useEffect(() => {
    return () => {
      setIsMetronomeActive(false);
    };
  }, [setIsMetronomeActive]);

  const currentMetronomeSong = useMemo(() => {
    if (!metronomeSongId) return null;
    return songs.find((song) => song.id === metronomeSongId) || null;
  }, [metronomeSongId, songs]);

  const shouldVirtualize = groupBy === 'none' && !activeVideoSong && !isNarrowViewport && filteredSongs.length >= (performanceMode ? 120 : 180);
  const virtualRowHeight = isNarrowViewport
    ? (performanceMode ? 210 : 230)
    : (performanceMode ? 136 : 156);
  const displayedSongCount = shouldVirtualize ? filteredSongs.length : visibleSongs.length;

  async function handleToggleMastery(song, event) {
    event.stopPropagation();
    if (!song?.id || !song?.canMarkMastery || updatingMasterySongId === song.id) return;

    const nextMasteredState = !song.isMasteredByCurrentUser;
    try {
      setUpdatingMasterySongId(song.id);
      const result = await updateSongMastery(song.id, nextMasteredState);
      if (typeof onSongMasteryUpdated === 'function') {
        onSongMasteryUpdated(song.id, {
          masteredBy: Array.isArray(result.masteredBy) ? result.masteredBy : [],
          isMasteredByCurrentUser: Boolean(result.isMasteredByCurrentUser),
        });
      }
    } catch (err) {
      alert(err?.message || 'Gagal memperbarui status penguasaan lagu');
    } finally {
      setUpdatingMasterySongId(null);
    }
  }

  function renderSongItem(song, style) {
    const isInlineVideoSong = activeVideoSong?.id === song.id;

    return (
      <React.Fragment key={song.id}>
        <div
          className={`song-item${isSongPlaying(song.id) ? ' song-item-playing' : ''}`}
          onClick={() => navigate(`/songs/view/${song.id}`)}
          style={style}
        >
          <div className="song-info">
            <h3 className="song-title">
              {song.title}
              {isSongPlaying(song.id) && <span className="song-playing-badge">LIVE</span>}
            </h3>
            <div className="song-meta">
              {song.artist && <span>👤 {song.artist}</span>}
              {song.key && <span>🎹 {song.key}</span>}
              {song.tempo && <span>⏱️ {song.tempo} BPM</span>}
              {song.genre && <span>🎸 {song.genre}</span>}
              {song.bandId && <span>🎤 Band: {song.bandName || '-'}</span>}
              <span className="song-setlist-count-meta">
                {setlistsLoading ? '...' : `📋 ${getSetlistCount(song.id)} setlist`}
              </span>
              <span className="song-contributor-meta">
                ✍️ {song.contributorName || song.contributorUsername || '-'}
              </span>
              <span className="song-mastery-summary">
                ✅ Selesai: {Array.isArray(song.masteredBy) ? song.masteredBy.length : 0}
                {Array.isArray(song.masteredBy) && song.masteredBy.length > 0
                  ? ` (${song.masteredBy.map((entry) => entry.username || '-').join(', ')})`
                  : ''}
              </span>
            </div>
          </div>

          <div
            className="song-actions"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="btn btn-secondary song-action-mini"
              title="Play metronom"
              aria-label={isMetronomeActive && metronomeSongId === song.id ? 'Stop metronom' : 'Start metronom'}
              onClick={(e) => handleToggleMetronome(song, e)}
            >
              {isMetronomeActive && metronomeSongId === song.id ? '⏹' : '⏱'}
            </button>
            {hasYouTubeVideo(song) && (
              <button
                className="btn btn-secondary song-action-mini"
                title="Play video"
                aria-label="Play video"
                onClick={(e) => handlePlayVideo(song, e)}
              >
                🎬
              </button>
            )}
            <button
              className="btn btn-secondary"
              title="Lihat Karaoke"
              onClick={() => navigate(`/karaoke/${song.id}`)}
            >
              Lirik
            </button>
            {
              <button
                className={`btn ${song.isMasteredByCurrentUser ? '' : 'btn-secondary'}`}
                title={song.canMarkMastery
                  ? (song.isMasteredByCurrentUser ? 'Batalkan penguasaan lagu' : 'Tandai lagu ini sudah dikuasai')
                  : 'Anda belum bisa menandai lagu ini'}
                onClick={(e) => handleToggleMastery(song, e)}
                disabled={!song.canMarkMastery || updatingMasterySongId === song.id}
              >
                {updatingMasterySongId === song.id
                  ? 'Menyimpan...'
                  : (song.canMarkMastery
                    ? (song.isMasteredByCurrentUser ? 'Sudah Kuasai' : 'Belum Kuasai')
                    : 'Belum Bisa Tandai')}
              </button>
            }
            {!performanceMode && (() => {
              const permission = permissionsBySongId[song.id] || {};
              const canEdit = Boolean(permission.canEdit);
              const canDelete = Boolean(permission.canDelete);
              const canDuplicate = Boolean(permission.canDuplicate);
              if (!canEdit && !canDelete && !canDuplicate) return null;
              return (
                <>
                  {canDuplicate && (
                    <button
                      onClick={() => onSongClick('newVersion', song.id)}
                      className="btn btn-secondary"
                      title="Buat versi baru"
                    >
                      Versi Baru
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => onSongClick('edit', song.id)}
                      className="btn"
                      title="Edit"
                    >
                      <EditIcon size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => onSongClick('delete', song.id)}
                      className="btn btn-red"
                      title="Hapus"
                    >
                      <DeleteIcon size={16} />
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {isInlineVideoSong && (
          <div ref={activeInlinePlayerRef} className="song-inline-player card song-inline-player-inline">
            <div className="song-inline-player-header">
              <div>
                <h3>Now Playing</h3>
                <p>
                  {song.title}
                  {song.artist ? ` - ${song.artist}` : ''}
                  {` | ${resolveTempo(song)} BPM`}
                </p>
              </div>
              <div className="song-inline-player-actions">
                <button className="btn btn-secondary" aria-label="Tutup video" onClick={handleCloseVideoPlayer}>
                  ✕
                </button>
              </div>
            </div>
            <div className="song-inline-player-video">
              <YouTubeViewer
                ref={videoRef}
                videoId={song.youtubeId || song.youtube_url}
              />
            </div>
          </div>
        )}
      </React.Fragment>
    );
  }

  return (
    <div className={`page-container${performanceMode ? ' performance-mode' : ''}`}>  
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>🎵 Lagu Saya</h1>
          <p>{displayedSongCount} ditampilkan dari {filteredSongs.length} hasil ({songs.length} total)</p>
          <div className="song-mastery-overview" aria-live="polite">
            <span className="song-mastery-overview-badge">✅ Sudah Dikuasai Saya: {masteredStats.masteredAllCount}/{masteredStats.totalSongs}</span>
            <span className="song-mastery-overview-text">({masteredStats.masteredPercent}%)</span>
            {filteredSongs.length !== songs.length && (
              <span className="song-mastery-overview-text">• Di hasil filter: {masteredStats.masteredFilteredCount}/{filteredSongs.length}</span>
            )}
          </div>
        </div>
        {!performanceMode && (
          <button className="btn" onClick={() => onSongClick('add')}>
            <PlusIcon size={18} /> Tambah Lagu
          </button>
        )}
      </div>

      {/* Filters & Search */}
      {/* Search Bar + Voice Search: Selalu tampil */}
      <div className="filter-container song-filter-container">
        <div className="song-search-row">
          <input
            type="text"
            placeholder="🔍 Cari judul, artis, atau genre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input-main"
          />
          <div className="song-search-voice-wrap">
            <VoiceSearchButton
              onResult={text => setSearch(text)}
              disabled={loading}
            />
          </div>
        </div>
        {/* Filter dan sort hanya jika !performanceMode */}
        {!performanceMode && (
          <div className="song-filter-grid">
            {/* Filter by Setlist */}
            <select
              value={filterBand}
              onChange={(e) => setFilterBand(e.target.value)}
              className="filter-select"
            >
              <option value="all">Semua Band</option>
              {bandOptions.map((band) => (
                <option key={band.id} value={band.id}>{band.name}</option>
              ))}
            </select>

            <select
              value={filterSetlist}
              onChange={e => setFilterSetlist(e.target.value)}
              className="filter-select"
            >
              <option value="all">Semua Setlist</option>
              {setlistOptions.map(sl => (
                <option key={sl.id} value={sl.id}>{sl.name}</option>
              ))}
            </select>
            <select
              value={filterArtist}
              onChange={(e) => setFilterArtist(e.target.value)}
              className="filter-select"
            >
              <option value="all">Semua Artis</option>
              {artists.map(artist => (
                <option key={artist} value={artist}>{artist}</option>
              ))}
            </select>

            <select
              value={filterKey}
              onChange={(e) => setFilterKey(e.target.value)}
              className="filter-select"
            >
              <option value="all">Semua Kunci</option>
              {keys.map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>

            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="filter-select"
            >
              <option value="all">Semua Genre</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="title">Urutkan: Judul</option>
              <option value="artist">Urutkan: Artis</option>
              <option value="key">Urutkan: Kunci</option>
              <option value="tempo">Urutkan: Tempo</option>
              <option value="created">Urutkan: Tanggal dibuat</option>
              <option value="updated">Urutkan: Tanggal diupdate</option>
            </select>

            <select
              value={masteryFilter}
              onChange={(e) => setMasteryFilter(e.target.value)}
              className="filter-select"
              title="Filter status penguasaan lagu"
              aria-label="Filter status penguasaan lagu"
            >
              <option value="all">Status: Semua Lagu</option>
              <option value="mastered">Status: Sudah Dikuasai</option>
              <option value="unmastered">Status: Belum Kuasai</option>
            </select>

            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="filter-select"
              aria-label="Kelompokkan daftar lagu utama"
            >
              <option value="none">Kelompokkan: Tidak</option>
              <option value="artist">Kelompokkan: Artis</option>
              <option value="genre">Kelompokkan: Genre</option>
              <option value="key">Kelompokkan: Kunci</option>
              <option value="band">Kelompokkan: Band</option>
              <option value="mastery">Kelompokkan: Penguasaan</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="btn btn-secondary"
              >
                ✕ Reset
              </button>
            )}

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary"
              title={sortOrder === 'asc' ? 'Urut Naik' : 'Urut Turun'}
            >
              {sortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A'}
            </button>
          </div>
        )}
      </div>

      {/* Song List */}
      {isMetronomeActive && !activeVideoSong && (
        <div className="song-inline-player card">
          <div className="song-inline-player-header">
            <div>
              <h3>Now Playing</h3>
              <p>
                Metronom aktif{currentMetronomeSong?.title ? `: ${currentMetronomeSong.title}` : ''}
              </p>
            </div>
            <div className="song-inline-player-actions">
              <button
                className={`btn ${isMetronomeActive ? '' : 'btn-secondary'}`}
                aria-label={isMetronomeActive ? 'Stop metronom' : 'Start metronom'}
                onClick={() => {
                  if (isMetronomeActive) {
                    setIsMetronomeActive(false);
                    setMetronomeSongId(null);
                    return;
                  }
                  setIsMetronomeActive(true);
                }}
              >
                {isMetronomeActive ? '⏹' : '⏱'}
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredSongs.length === 0 ? (
        <div className="empty-state">
          <p>
            {hasActiveFilters ? 'Tidak ada lagu yang cocok dengan filter' : 'Belum ada lagu'}
          </p>
          {hasActiveFilters && search.trim() && (
            <div className="song-empty-search-tools">
              <p>Tidak menemukan lagu? Cari di Google:</p>
              <div className="song-empty-search-links">
                <a
                  href={`https://www.google.com/search?q=chord+${encodeURIComponent(search)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  🔍 Chord "{search}"
                </a>
                <a
                  href={`https://www.google.com/search?q=lirik+${encodeURIComponent(search)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  🎤 Lirik "{search}"
                </a>
              </div>
            </div>
          )}
          {!hasActiveFilters && !performanceMode && (
            <button className="btn" onClick={() => onSongClick('add')}>
              <PlusIcon size={18} /> Tambah Lagu Pertama
            </button>
          )}
        </div>
      ) : (
        <>
          {shouldVirtualize ? (
            <div className="song-list-virtual-shell">
              <VirtualList
                className="song-list-container song-list-virtualized"
                rowComponent={VirtualSongRow}
                rowCount={filteredSongs.length}
                rowHeight={virtualRowHeight}
                rowProps={{ songs: filteredSongs, renderSongItem }}
                overscanCount={6}
                style={{ height: 'min(68vh, 760px)' }}
              />
            </div>
          ) : (
            <div className="song-list-container">
              {displayedSongRows.map((row) => {
                if (row.type === 'group') {
                  return (
                    <div key={row.key} className="song-group-header">
                      <span className="song-group-title">{row.label}</span>
                      <span className="song-group-count">{row.count} lagu</span>
                    </div>
                  );
                }
                return renderSongItem(row.song);
              })}
            </div>
          )}
          {!shouldVirtualize && hiddenSongsCount > 0 && (
            <div className="song-list-load-more">
              <button
                className="btn btn-secondary"
                onClick={() => setVisibleCount(prev => prev + pageSize)}
              >
                Muat lebih banyak ({hiddenSongsCount} lagu lagi)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
