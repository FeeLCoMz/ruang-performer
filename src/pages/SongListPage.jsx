
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { canPerformAction, PERMISSIONS } from '../utils/permissionUtils.js';
import PlusIcon from '../components/PlusIcon.jsx';
import EditIcon from '../components/EditIcon.jsx';
import SongCard from '../components/SongCard.jsx';
import { StudioMediaColumn } from '../components/SongStudioLayout.jsx';
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
  // Playback state untuk komponen media shared (sama dengan song view)
  const [inlineVideoPlaying, setInlineVideoPlaying] = useState(false);
  const [inlineVideoTime, setInlineVideoTime] = useState(0);
  const [inlineVideoDuration, setInlineVideoDuration] = useState(0);

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

  // Helper: status penguasaan lagu oleh user yang sedang login.
  // 'mastered' | 'learning' | 'none' — dipakai untuk chip kartu.
  function getMasteryStatus(song) {
    if (!currentUserId) return 'none';
    // masteredBy bisa berisi entri learning milik user ini
    const ownEntry = Array.isArray(song?.masteredBy)
      ? song.masteredBy.find((entry) => String(entry?.userId) === String(currentUserId))
      : null;
    if (ownEntry?.status === 'learning') return 'learning';
    if (song?.isMasteredByCurrentUser) return 'mastered';
    if (ownEntry) return ownEntry.status === 'learning' ? 'learning' : 'mastered';
    return 'none';
  }

  const MASTERY_STATUS_META = {
    mastered: { icon: '🟢', label: 'Dikuasai', title: 'Status: Dikuasai' },
    learning: { icon: '🟡', label: 'Perlu Latihan', title: 'Status: Perlu Latihan' },
    none: { icon: '🔴', label: 'Belum Diulik', title: 'Status: Belum diulik' },
  };

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
    setInlineVideoPlaying(false);
    setActiveVideoSong(null);
  }

  // Lacak posisi & status video untuk komponen media shared
  useEffect(() => {
    if (!activeVideoSong) {
      setInlineVideoPlaying(false);
      setInlineVideoTime(0);
      setInlineVideoDuration(0);
      return undefined;
    }

    const intervalId = setInterval(() => {
      const player = videoRef.current;
      if (!player) return;
      if (typeof player.getPlayerState === 'function') {
        setInlineVideoPlaying(player.getPlayerState() === 1);
      }
      if (typeof player.currentTime === 'number') setInlineVideoTime(player.currentTime);
      if (typeof player.duration === 'number') setInlineVideoDuration(player.duration);
    }, 500);

    return () => clearInterval(intervalId);
  }, [activeVideoSong]);

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
    const masteryStatus = getMasteryStatus(song);
    const masteryMeta = MASTERY_STATUS_META[masteryStatus];

    return (
      <React.Fragment key={song.id}>
        <SongCard
          style={style}
          title={song.title}
          isPlaying={isSongPlaying(song.id)}
          onClick={() => navigate(`/songs/view/${song.id}`)}
          headingStatus={(
            <span
              className={`song-mastery-chip mastery-${masteryStatus}`}
              title={masteryMeta.title}
            >
              <span aria-hidden="true">{masteryMeta.icon}</span>
              {masteryMeta.label}
            </span>
          )}
          metaPrimary={(
            <div className="song-meta-line song-meta-line-primary">
              {song.artist && <span className="song-chip">👤 {song.artist}</span>}
              {song.bandId && <span className="song-chip">🎤 {song.bandName || '-'}</span>}
              {song.genre && <span className="song-chip">🎸 {song.genre}</span>}
              {/* Author (kontributor) tepat setelah genre */}
              {(song.contributor || song.contributorName) && (
                <span className="song-chip song-chip-muted" title={`Ditambahkan oleh: ${song.contributor || song.contributorName}`}>
                  ✍️ {song.contributor || song.contributorName}
                </span>
              )}
            </div>
          )}
          metaDetail={(
            <div className="song-meta-line song-meta-line-detail">
              {song.key && <span className="song-chip">🎹 {song.key}</span>}
              {song.tempo && <span className="song-chip">⏱️ {song.tempo} BPM</span>}
              <span className={`song-mood-badge mood-${mood.tone}`} title={`Mood berdasarkan ${mood.sourceHint}`}>
                {mood.label}
              </span>
              <span className="song-chip song-chip-muted song-setlist-count-meta">
                {setlistsLoading ? '...' : `📋 ${getSetlistCount(song.id)} setlist`}
              </span>
              {Array.isArray(song.masteredBy) && song.masteredBy.length > 0 && (
                <span className="song-chip song-mastery-summary">
                  ✅ {song.masteredBy.length} kuasai
                </span>
              )}
            </div>
          )}
          actions={(
            <>
              {hasYouTubeVideo(song) && (
                <button
                  className="btn btn-secondary song-action-btn"
                  title="Putar video referensi"
                  aria-label="Play video"
                  onClick={(e) => handlePlayVideo(song, e)}
                >
                  <span aria-hidden="true">🎬</span>
                  <span className="song-action-btn-label">Video</span>
                </button>
              )}
              {(() => {
                const permission = permissionsBySongId[song.id] || {};
                const canEdit = Boolean(permission.canEdit);
                if (!canEdit) return null;
                return (
                  <button
                    onClick={() => onSongClick('edit', song.id)}
                    className="btn song-action-btn"
                    title="Edit lirik & chord"
                    aria-label="Edit lirik dan chord"
                  >
                    <EditIcon size={16} />
                    <span className="song-action-btn-label">Edit</span>
                  </button>
                );
              })()}
            </>
          )}
        />

        {isInlineVideoSong && (
          <div ref={activeInlinePlayerRef} className="song-panel media-panel song-inline-player card song-inline-player-inline">
            {/* Media & kontrol pakai komponen yang sama dengan halaman song view */}
            <StudioMediaColumn
              youtubeId={song.youtubeId || song.youtube_url}
              youtubeRef={videoRef}
              timeMarkers={[]}
              isPlaying={inlineVideoPlaying}
              onTogglePlay={() => {
                if (videoRef.current && typeof videoRef.current.handleTogglePlayPause === 'function') {
                  videoRef.current.handleTogglePlayPause();
                }
                setInlineVideoPlaying((prev) => !prev);
              }}
              onSeek={(time) => videoRef.current?.handleSeek?.(time)}
              currentTime={inlineVideoTime}
              duration={inlineVideoDuration}
              getCurrentYouTubeTime={() =>
                typeof videoRef.current?.currentTime === 'number' ? videoRef.current.currentTime : 0
              }
            />
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
        </div>
        <div className="page-header-actions">
          <button
            className="btn song-add-btn"
            onClick={() => onSongClick('add')}
            title="Tambah lagu baru"
            aria-label="Tambah lagu baru"
          >
            <PlusIcon size={18} />
            <span className="song-add-btn-label">Tambah</span>
          </button>
        </div>
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
        {/* Filter dan sort — satu baris ringkas */}
        <div className="song-filter-toolbar">
          <label className="song-sort-control">
            <span className="song-sort-icon" aria-hidden="true">⇅</span>
            <span className="sr-only">Urutkan berdasarkan</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select song-sort-select"
              title="Urutkan berdasarkan"
            >
              <option value="title">Judul</option>
              <option value="artist">Artis</option>
              <option value="key">Kunci</option>
              <option value="tempo">Tempo</option>
              <option value="created">Tanggal dibuat</option>
              <option value="updated">Tanggal diupdate</option>
            </select>
          </label>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn btn-secondary song-sort-order-btn"
            title={sortOrder === 'asc' ? 'Urutan naik (A-Z)' : 'Urutan turun (Z-A)'}
            aria-label={sortOrder === 'asc' ? 'Urutan naik' : 'Urutan turun'}
          >
            <span aria-hidden="true">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="btn btn-secondary song-filter-reset-btn"
              title="Hapus semua filter"
            >
              ✕ Reset
            </button>
          )}
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
