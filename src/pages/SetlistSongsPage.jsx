

import SongList from '../components/SongList.jsx';
import PlusIcon from '../components/PlusIcon.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';

export default function SetlistSongsPage({ setlists, songs, setSetlists }) {
  const { setlistId } = useParams();
  const navigate = useNavigate();
  const setlist = setlists.find(s => String(s.id) === String(setlistId));
  const [localOrder, setLocalOrder] = useState(setlist ? [...(setlist.songs || [])] : []);
  const [showAddSong, setShowAddSong] = useState(false);
  const [addSongSearch, setAddSongSearch] = useState('');
  const [addSongError, setAddSongError] = useState('');
  const [addingSongId, setAddingSongId] = useState(null);
  const addSongInputRef = useRef(null);
  if (!setlist) return <div className="main-content error-text">Setlist tidak ditemukan</div>;
  const setlistSongs = (localOrder || []).map(id => songs.find(song => song.id === id)).filter(Boolean);

  // Lagu yang belum ada di setlist
  const availableSongs = songs.filter(song => !(localOrder || []).includes(song.id));
  const filteredAvailableSongs = availableSongs.filter(song =>
    (song.title || '').toLowerCase().includes(addSongSearch.toLowerCase()) ||
    (song.artist || '').toLowerCase().includes(addSongSearch.toLowerCase())
  );

  async function handleReorder(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const newOrder = Array.from(localOrder);
    const [removed] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, removed);
    setLocalOrder(newOrder);
    // Update ke parent state jika ada setSetlists
    if (setSetlists) {
      setSetlists(prev => prev.map(s => s.id === setlist.id ? { ...s, songs: newOrder } : s));
    }
    // Update ke backend
    try {
      await fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...setlist,
          songs: newOrder,
        }),
      });
    } catch (e) {
      // Optional: tampilkan error ke user
      console.error('Gagal update urutan setlist ke backend', e);
    }
  }

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
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <>
      <button className="back-btn" onClick={() => navigate('/setlists')}>&larr; Kembali ke daftar setlist</button>
      <div className="section-title">{setlist.name}</div>
      <div className="info-text info-spacing">
        {setlistSongs.length} Lagu
      </div>
      <button className="tab-btn add-song-btn" onClick={() => setShowAddSong(true)} title="Tambah Lagu ke Setlist">
        <PlusIcon size={22} /> Tambah Lagu
      </button>
      {showAddSong && (
        <div className="modal-overlay" onClick={e => { if (e.target.classList.contains('modal-overlay')) setShowAddSong(false); }}>
          <div className="modal add-song-modal">
            <div className="modal-title">Tambah Lagu ke Setlist</div>
            <input
              ref={addSongInputRef}
              type="text"
              placeholder="Cari judul atau artist..."
              value={addSongSearch}
              onChange={e => setAddSongSearch(e.target.value)}
              className="search-input full-width mb-12"
              autoFocus
            />
            <ul className="song-list song-list-scroll mb-8">
              {filteredAvailableSongs.length === 0 && (
                <li className="info-text">Tidak ada lagu tersedia.</li>
              )}
              {filteredAvailableSongs.map(song => (
                <li key={song.id} className={`song-list-item pointer${addingSongId === song.id ? ' loading' : ''}`} onClick={() => handleAddSongToSetlist(song.id)}>
                  <span className="fw-700">{song.title}</span> <span className="text-muted ml-8">{song.artist}</span>
                  {addingSongId === song.id && <span className="ml-8">⏳</span>}
                </li>
              ))}
            </ul>
            {addSongError && <div className="error-text mb-8">{addSongError}</div>}
            <button className="back-btn mt-8" onClick={() => setShowAddSong(false)}>Batal</button>
          </div>
        </div>
      )}
      <SongList
        songs={setlistSongs}
        onSongClick={song => song && song.id && navigate(`/songs/${song.id}`)}
        emptyText="Setlist ini belum berisi lagu."
        showNumber={true}
        draggable={true}
        onReorder={handleReorder}
      />
    </>
  );
}
