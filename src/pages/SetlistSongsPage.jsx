

import PlusIcon from '../components/PlusIcon.jsx';
import EditIcon from '../components/EditIcon.jsx';
import DeleteIcon from '../components/DeleteIcon.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo } from 'react';
import * as authUtils from '../utils/auth.js';

export default function SetlistSongsPage({ setlists, songs, setSetlists, setActiveSetlist, loadingSetlists }) {
  const { id: setlistId } = useParams();
  const navigate = useNavigate();
  const isLoading = typeof loadingSetlists === 'boolean' ? loadingSetlists : !Array.isArray(setlists);
  const setlist = Array.isArray(setlists) ? setlists.find(s => String(s.id) === String(setlistId)) : null;
  
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
  const [sortBy, setSortBy] = useState('custom');
  const [sortOrder, setSortOrder] = useState('asc');

  // State untuk modal tambah lagu
  const [showAddSong, setShowAddSong] = useState(false);
  const [addSongSearch, setAddSongSearch] = useState('');
  const [addSongError, setAddSongError] = useState('');
  const [addingSongId, setAddingSongId] = useState(null);
  const addSongInputRef = useRef(null);

  // State untuk share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // State untuk edit lagu
  const [editSongId, setEditSongId] = useState(null);
  const [editSongKey, setEditSongKey] = useState('');
  const [editSongTempo, setEditSongTempo] = useState('');
  const [editSongStyle, setEditSongStyle] = useState('');

  // State untuk konfirmasi hapus
  const [confirmDeleteSongId, setConfirmDeleteSongId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Get songs dalam setlist sesuai localOrder
  const setlistSongs = (localOrder || []).map(id => songs.find(song => song.id === id)).filter(Boolean);

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
      const matchSearch = !searchText || 
        (song.title || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (song.artist || '').toLowerCase().includes(searchText.toLowerCase());
      const matchArtist = !filterArtist || song.artist === filterArtist;
      const matchGenre = !filterGenre || song.genre === filterGenre;
      return matchSearch && matchArtist && matchGenre;
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
  }, [setlistSongs, searchText, filterArtist, filterGenre, sortBy, sortOrder]);

  const hasActiveFilters = searchText || filterArtist || filterGenre;

  // Early returns AFTER all hooks
  if (isLoading) return <div className="main-content info-text">Memuat setlist...</div>;
  if (!setlist) return <div className="main-content error-text">Setlist tidak ditemukan</div>;

  function handleClearFilters() {
    setSearchText('');
    setFilterArtist('');
    setFilterGenre('');
  }

  // Generate share text
  const shareUrl = `${window.location.origin}/setlists/${setlist.id}`;
  const shareText = `🎶 Setlist: ${setlist.name}\n\n` +
    setlistSongs.map((song, idx) => `${idx + 1}. ${song.title}${song.artist ? ' - ' + song.artist : ''}`).join('\n') +
    `\n\nLihat detail & chord: ${shareUrl}`;

  function handleCopyShare() {
    navigator.clipboard.writeText(shareText);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  }

  // Lagu yang belum ada di setlist
  const availableSongs = songs.filter(song => !(localOrder || []).includes(song.id));
  const filteredAvailableSongs = availableSongs.filter(song =>
    (song.title || '').toLowerCase().includes(addSongSearch.toLowerCase()) ||
    (song.artist || '').toLowerCase().includes(addSongSearch.toLowerCase())
  );

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
  async function handleAddSongToSetlist(songId) {
    setAddingSongId(songId);
    setAddSongError('');
    const newOrder = [...localOrder, songId];
    setLocalOrder(newOrder);
    if (setSetlists) {
      setSetlists(prev => prev.map(s => s.id === setlist.id ? { ...s, songs: newOrder } : s));
    }
    try {
      const res = await fetch(`/api/setlists/${setlist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authUtils.getAuthHeader() },
        body: JSON.stringify({ ...setlist, songs: newOrder }),
      });
      if (!res.ok) throw new Error('Gagal menambah lagu ke setlist');
      setShowAddSong(false);
      setAddSongSearch('');
    } catch (e) {
      setAddSongError(e.message || 'Gagal menambah lagu');
    } finally {
      setAddingSongId(null);
    }
  }

  // Handler edit metadata lagu di setlist
  function openEditSong(songId) {
    setEditSongId(songId);
    const song = setlistSongs.find(s => s.id === songId);
    if (song) {
      setEditSongKey(song.key || '');
      setEditSongTempo(song.tempo || '');
      setEditSongStyle(song.genre || '');
    }
  }

  async function handleEditSongSave() {
    if (!editSongId) return;
    const songIdx = localOrder.indexOf(editSongId);
    const newSetlistSongMeta = Array.isArray(setlist.setlistSongMeta) ? [...setlist.setlistSongMeta] : [];
    newSetlistSongMeta[songIdx] = {
      id: editSongId,
      key: editSongKey,
      tempo: editSongTempo,
      style: editSongStyle
    };
    if (setSetlists) {
      setSetlists(prev => prev.map(s => s.id === setlist.id ? { ...s, setlistSongMeta: newSetlistSongMeta } : s));
    }
    try {
      await fetch(`/api/setlists/${setlist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authUtils.getAuthHeader() },
        body: JSON.stringify({ ...setlist, setlistSongMeta: newSetlistSongMeta }),
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

  async function confirmDeleteSong() {
    if (!confirmDeleteSongId) return;
    setDeleting(true);
    const songId = confirmDeleteSongId;
    const newOrder = localOrder.filter(id => id !== songId);
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
      console.error('Gagal hapus lagu dari setlist', e);
    }
    setDeleting(false);
    setConfirmDeleteSongId(null);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>📋 {setlist.name}</h1>
          <p>{setlistSongs.length} lagu di setlist ini</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-base back-btn" onClick={() => navigate('/setlists')}>&larr; Kembali</button>
          <button className="btn-base tab-btn add-song-btn" onClick={() => setShowAddSong(true)} title="Tambah Lagu ke Setlist">
            <PlusIcon size={22} /> Tambah Lagu
          </button>
          <button className="btn-base tab-btn add-song-btn share-setlist-btn" onClick={() => setShowShareModal(true)} title="Bagikan Setlist">
            📤 Bagikan
          </button>
        </div>
      </div>

      {/* Filter dan Search Bar */}
      <div className="filter-container">
        {/* Search Input */}
        <input
          type="text"
          placeholder="🔍 Cari judul atau artis..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="search-input-main"
        />

        {/* Filter Row */}
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
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="custom">Urutkan: Custom</option>
            <option value="title">Urutkan: Judul</option>
            <option value="artist">Urutkan: Artis</option>
            <option value="key">Urutkan: Kunci</option>
            <option value="tempo">Urutkan: Tempo</option>
            <option value="created">Urutkan: Tanggal</option>
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
            {hasActiveFilters ? 'Tidak ada lagu yang cocok dengan filter' : 'Setlist ini belum berisi lagu'}
          </p>
          {!hasActiveFilters && setlistSongs.length === 0 && (
            <button className="btn-base" onClick={() => setShowAddSong(true)} style={{ marginTop: '12px' }}>
              <PlusIcon size={18} /> Tambah Lagu Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="song-list-container">
          {filteredSongs.map((song, idx) => {
            const originalIdx = setlistSongs.indexOf(song);
            return (
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
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="song-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => originalIdx > 0 && handleReorder(originalIdx, originalIdx - 1)}
                    className="btn-base arrow-btn"
                    disabled={originalIdx === 0}
                    title="Naik satu posisi"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => originalIdx < setlistSongs.length - 1 && handleReorder(originalIdx, originalIdx + 1)}
                    className="btn-base arrow-btn"
                    disabled={originalIdx === setlistSongs.length - 1}
                    title="Turun satu posisi"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => openEditSong(song.id)}
                    className="btn-base"
                    style={{ padding: '6px 12px', fontSize: '0.85em' }}
                    title="Edit detail lagu di setlist"
                  >
                    <EditIcon size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteSongFromSetlist(song.id)}
                    className="btn-base"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.85em',
                      background: '#dc2626',
                      borderColor: '#b91c1c',
                      color: '#fff'
                    }}
                    title="Hapus dari setlist"
                  >
                    <DeleteIcon size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Konfirmasi Hapus Lagu dari Setlist */}
      {confirmDeleteSongId && (
        <div className="modal-overlay" tabIndex={-1}>
          <div className="modal" role="dialog" aria-modal="true" tabIndex={0}>
            <div className="modal-title">Konfirmasi Hapus Lagu</div>
            <div style={{ marginBottom: 16 }}>
              Apakah Anda yakin ingin menghapus lagu ini dari setlist?
            </div>
            <button className="btn-base danger-btn" onClick={confirmDeleteSong} disabled={deleting}>
              {deleting ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
            <button className="btn-base back-btn" style={{ marginLeft: 8 }} onClick={() => setConfirmDeleteSongId(null)} disabled={deleting}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Modal Bagikan Setlist */}
      {showShareModal && (
        <div
          className="modal-overlay"
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
            <textarea
              className="modal-input"
              rows={7}
              value={shareText}
              readOnly
            />
            <button className="btn-base tab-btn" style={{ marginBottom: 8 }} onClick={handleCopyShare}>
              {shareCopied ? '✅ Tersalin!' : 'Salin Teks'}
            </button>
            <button className="btn-base back-btn" onClick={() => setShowShareModal(false)}>Tutup</button>
          </div>
        </div>
      )}

      {/* Modal Tambah Lagu ke Setlist */}
      {showAddSong && (
        <div
          className="modal-overlay"
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
                  className="song-list-item pointer"
                  style={addingSongId === song.id ? { opacity: 0.5 } : undefined}
                  onClick={() => handleAddSongToSetlist(song.id)}
                >
                  <span style={{ fontWeight: 700, color: 'var(--primary-accent-dark, #3730a3)' }}>{song.title}</span> <span style={{ color: 'var(--text-muted, #888)', marginLeft: 8 }}>{song.artist}</span>
                  {addingSongId === song.id && <span style={{ marginLeft: 8 }}>⏳</span>}
                </li>
              ))}
            </ul>
            {addSongError && <div className="error-text" style={{ marginBottom: 8 }}>{addSongError}</div>}
            <button className="back-btn" style={{ marginTop: 8 }} onClick={() => setShowAddSong(false)}>Batal</button>
          </div>
        </div>
      )}

      {/* Modal Edit Detail Lagu di Setlist */}
      {editSongId != null && (
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
            <label>Tempo
              <input type="text" value={editSongTempo} onChange={e => setEditSongTempo(e.target.value)} className="modal-input" style={{ marginBottom: 8 }} />
            </label>
            <label>Genre
              <input type="text" value={editSongStyle} onChange={e => setEditSongStyle(e.target.value)} className="modal-input" style={{ marginBottom: 8 }} />
            </label>
            <button className="btn-base tab-btn" style={{ marginBottom: 8 }} onClick={handleEditSongSave}>Simpan</button>
            <button className="btn-base back-btn" style={{ marginTop: 8 }} onClick={() => setEditSongId(null)}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
