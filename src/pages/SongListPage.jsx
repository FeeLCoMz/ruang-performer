
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { canPerformAction, PERMISSIONS } from '../utils/permissionUtils.js';
import PlusIcon from '../components/PlusIcon.jsx';
import EditIcon from '../components/EditIcon.jsx';
import YouTubeViewer from '../components/YouTubeViewer.jsx';
import { SongListSkeleton } from '../components/LoadingSkeleton.jsx';
import { fetchSetLists } from '../apiClient.js';
import VoiceSearchButton from '../components/VoiceSearchButton.jsx';
import { updatePageMeta, pageMetadata } from '../utils/metaTagsUtil.js';
import useMetronome from '../hooks/useMetronome.js';
import { inferSongMood } from '../utils/songMoodUtils.js';
import { STORAGE_KEYS } from '../utils/storageKeys.js';
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

export default function SongListPage({ songs, loading, error, onSongClick }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [masteryError, setMasteryError] = useState(null);
  const currentUserId = user?.userId || user?.id;
  const pageSize = 60;
  // Restore state from localStorage
  const getPersistedState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SONG_LIST_PAGE_STATE);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const persisted = getPersistedState();
  const [search, setSearch] = useState(persisted.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(persisted.search || '');
  const [setlists, setSetlists] = useState([]);
  const [setlistsLoading, setSetlistsLoading] = useState(true);
  const [sortBy, setSortBy] = useState(persisted.sortBy || 'updated');
  const [sortOrder, setSortOrder] = useState(persisted.sortOrder || 'desc');
  const [metronomeTempo, setMetronomeTempo] = useState(120);
  const [metronomeSongId, setMetronomeSongId] = useState(null);
  const [isMetronomeActive, setIsMetronomeActive] = useMetronome(false, metronomeTempo);
  const [activeVideoSong, setActiveVideoSong] = useState(null);
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
      sortBy,
      sortOrder,
    };
    localStorage.setItem(STORAGE_KEYS.SONG_LIST_PAGE_STATE, JSON.stringify(state));
  }, [search, sortBy, sortOrder]);

  useEffect(() => {
    updatePageMeta(pageMetadata.songs);
    // Fetch setlists for song usage count.
    let mounted = true;
    setSetlistsLoading(true);
    Promise.allSettled([fetchSetLists()])
      .then(([setlistsResult]) => {
        if (!mounted) return;

        if (setlistsResult.status === 'fulfilled') {
          setSetlists(setlistsResult.value || []);
        } else {
          setSetlists([]);
        }
      })
      .finally(() => { if (mounted) setSetlistsLoading(false); });
    return () => { mounted = false; };
  }, []);

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
  }, [songs, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [debouncedSearch, sortBy, sortOrder, pageSize]);

  const handleClearFilters = () => {
    setSearch('');
    setSortBy('updated');
    setSortOrder('desc');
  };

  const hasActiveFilters = Boolean(search);

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

      if (song.userId) {
        canEdit = canPerformAction(
          user,
          song.bandId || null,
          { role: user?.role || 'member', bandId: song.bandId || null },
          PERMISSIONS.SONG_EDIT
        ) || song.userId === currentUserId;
      }

      map[song.id] = { canEdit };
    });
    return map;
  }, [filteredSongs, user, currentUserId]);

  const visibleSongs = useMemo(() => {
    return filteredSongs.slice(0, visibleCount);
  }, [filteredSongs, visibleCount]);

  const displayedSongRows = useMemo(
    () => visibleSongs.map((song) => ({ type: 'song', song })),
    [visibleSongs]
  );

  const hiddenSongsCount = Math.max(filteredSongs.length - visibleSongs.length, 0);

  const masteredStats = useMemo(() => {
    const masteredAllCount = songs.filter((song) => Boolean(song?.isMasteredByCurrentUser)).length;

    const totalSongs = songs.length;
    const masteredPercent = totalSongs > 0 ? Math.round((masteredAllCount / totalSongs) * 100) : 0;

    return {
      masteredAllCount,
      totalSongs,
      masteredPercent,
    };
  }, [songs]);

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

  const shouldVirtualize = !activeVideoSong && !isNarrowViewport && filteredSongs.length >= 180;
  const virtualRowHeight = isNarrowViewport ? 230 : 156;

  function renderSongItem(song, style) {
    const isInlineVideoSong = activeVideoSong?.id === song.id;
    const mood = inferSongMood(song);

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
              <span className={`song-mood-badge mood-${mood.tone}`} title={`Mood berdasarkan ${mood.sourceHint}`}>
                {mood.label}
              </span>
              {song.artist && <span>👤 {song.artist}</span>}
              {song.key && <span>🎹 {song.key}</span>}
              {song.tempo && <span>⏱️ {song.tempo} BPM</span>}
              {song.genre && <span>🎸 {song.genre}</span>}
              {song.bandId && <span>🎤 {song.bandName || '-'}</span>}
              <span className="song-setlist-count-meta">
                {setlistsLoading ? '...' : `📋 ${getSetlistCount(song.id)} setlist`}
              </span>
              {Array.isArray(song.masteredBy) && song.masteredBy.length > 0 && (
                <span className="song-mastery-summary">
                  ✅ {song.masteredBy.length} kuasai
                </span>
              )}
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
            {(() => {
              const permission = permissionsBySongId[song.id] || {};
              const canEdit = Boolean(permission.canEdit);
              if (!canEdit) return null;
              return (
                <button
                  onClick={() => onSongClick('edit', song.id)}
                  className="btn"
                  title="Edit"
                >
                  <EditIcon size={16} />
                </button>
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
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>🎵 Lagu Saya</h1>
          <p>{filteredSongs.length} lagu</p>
          <div className="song-mastery-overview" aria-live="polite">
            <span className="song-mastery-overview-badge">✅ Dikuasai: {masteredStats.masteredAllCount}/{masteredStats.totalSongs} ({masteredStats.masteredPercent}%)</span>
          </div>
        </div>
        <button className="btn" onClick={() => onSongClick('add')} title="Tambah lagu baru">
          + Tambah
        </button>
      </div>

      {masteryError && (
        <div className="error-text" role="alert">
          {masteryError}
          <button
            type="button"
            className="user-management-banner-close"
            onClick={() => setMasteryError(null)}
          >×</button>
        </div>
      )}

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
              onError={setMasteryError}
              disabled={loading}
            />
          </div>
        </div>
        {/* Filter dan sort */}
        <div className="song-filter-grid">
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
          {!hasActiveFilters && (
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
              {displayedSongRows.map((row) => renderSongItem(row.song))}
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
