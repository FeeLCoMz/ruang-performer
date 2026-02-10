
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { canPerformAction, PERMISSIONS } from '../utils/permissionUtils.js';
import PlusIcon from '../components/PlusIcon.jsx';
import EditIcon from '../components/EditIcon.jsx';
import DeleteIcon from '../components/DeleteIcon.jsx';
import { SongListSkeleton } from '../components/LoadingSkeleton.jsx';
import { fetchSetLists } from '../apiClient.js';
import { updatePageMeta, pageMetadata } from '../utils/metaTagsUtil.js';

export default function SongListPage({ songs, loading, error, onSongClick }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.userId || user?.id;
  const [search, setSearch] = useState('');
  const [setlists, setSetlists] = useState([]);
  const [setlistsLoading, setSetlistsLoading] = useState(true);
  const [filterArtist, setFilterArtist] = useState('all');
  const [filterKey, setFilterKey] = useState('all');
  const [filterGenre, setFilterGenre] = useState('all');
  const [sortBy, setSortBy] = useState('updated');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    updatePageMeta(pageMetadata.songs);
    // Fetch setlists for song usage count
    let mounted = true;
    setSetlistsLoading(true);
    fetchSetLists()
      .then(data => { if (mounted) setSetlists(data || []); })
      .catch(() => { if (mounted) setSetlists([]); })
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

  // Filter and sort songs
  const filteredSongs = useMemo(() => {
    let result = [...songs];

    // Apply search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
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
  }, [songs, search, filterArtist, filterKey, filterGenre, sortBy, sortOrder]);

  const handleClearFilters = () => {
    setSearch('');
    setFilterArtist('all');
    setFilterKey('all');
    setFilterGenre('all');
    setSortBy('updated');
    setSortOrder('desc');
  };

  const hasActiveFilters = search || filterArtist !== 'all' || filterKey !== 'all' || filterGenre !== 'all';

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
        <div className="error-text" style={{ padding: '20px' }}>{error}</div>
      </div>
    );
  }


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

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>🎵 Lagu Saya</h1>
          <p>{filteredSongs.length} dari {songs.length} lagu</p>
        </div>
        <button className="btn-base" onClick={() => onSongClick('add')}>
          <PlusIcon size={18} /> Tambah Lagu
        </button>
      </div>

      {/* Filters & Search */}
      <div className="filter-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Search Bar */}
        <input
          type="text"
          placeholder="🔍 Cari judul, artis, atau genre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input-main"
        />

        {/* Filters Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px'
        }}>
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

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn-base sort-button"
            title={sortOrder === 'asc' ? 'Urut Naik' : 'Urut Turun'}
          >
            {sortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A'}
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="btn-base reset-filter-btn"
            >
              ✕ Reset
            </button>
          )}
        </div>
      </div>

      {/* Song List */}
      {filteredSongs.length === 0 ? (
        <div className="empty-state">
          <p>
            {hasActiveFilters ? 'Tidak ada lagu yang cocok dengan filter' : 'Belum ada lagu'}
          </p>
          {!hasActiveFilters && (
            <button className="btn-base" onClick={() => onSongClick('add')} style={{ marginTop: '12px' }}>
              <PlusIcon size={18} /> Tambah Lagu Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="song-list-container">
          {filteredSongs.map(song => (
            <div
              key={song.id}
              className="song-item"
              onClick={() => navigate(`/songs/view/${song.id}`)}
            >
              {/* Song Info */}
              <div className="song-info">
                <h3 className="song-title">
                  {song.title}
                </h3>
                <div className="song-meta">
                  {song.artist && <span>👤 {song.artist}</span>}
                  {song.key && <span>🎹 {song.key}</span>}
                  {song.tempo && <span>⏱️ {song.tempo} BPM</span>}
                  {song.genre && <span>🎸 {song.genre}</span>}
                  <span style={{ color: 'var(--primary-accent)', marginLeft: 8, fontSize: '0.95em' }}>
                    {setlistsLoading ? '...' : `📋 ${getSetlistCount(song.id)} setlist`}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div
                className="song-actions"
                onClick={(e) => e.stopPropagation()}
                style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
              >
                <button
                  className="btn-base btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.85em' }}
                  title="Lihat Lirik"
                  onClick={() => navigate(`/songs/lyrics/${song.id}`)}
                >
                  Lirik
                </button>
                {(() => {
                  // Permission logic: allow edit/delete if user is creator OR has global permission
                  let canEdit = false;
                  let canDelete = false;
                  if (song.userId) {
                    canEdit = canPerformAction(
                      user,
                      song.bandId || null,
                      { role: user?.role || 'member', bandId: song.bandId || null },
                      PERMISSIONS.SONG_EDIT
                    ) || song.userId === currentUserId;
                    canDelete = canPerformAction(
                      user,
                      song.bandId || null,
                      { role: user?.role || 'member', bandId: song.bandId || null },
                      PERMISSIONS.SONG_DELETE
                    ) && song.userId === currentUserId;
                  }
                  if (!canEdit && !canDelete) return null;
                  return (
                    <>
                      {canEdit && (
                        <button
                          onClick={() => onSongClick('edit', song.id)}
                          className="btn-base"
                          style={{ padding: '6px 12px', fontSize: '0.85em' }}
                          title="Edit"
                        >
                          <EditIcon size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => onSongClick('delete', song.id)}
                          className="btn-base"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.85em',
                            background: '#dc2626',
                            borderColor: '#b91c1c',
                            color: '#fff'
                          }}
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
          ))}
        </div>
      )}
    </div>
  );
}
