

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
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [addSongSearch, setAddSongSearch] = useState('');
  const [addSongError, setAddSongError] = useState('');
  const [addingSongId, setAddingSongId] = useState(null);
  const addSongInputRef = useRef(null);
  if (!setlist) return <div className="main-content error-text">Setlist tidak ditemukan</div>;
  const setlistSongs = (localOrder || []).map(id => songs.find(song => song.id === id)).filter(Boolean);

  // Generate share text and copy handler here
  const shareUrl = `${window.location.origin}/setlists/${setlist.id}/songs`;
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
    // Update ke backend (PUT ke /api/setlists/:id)
    try {
      await fetch(`/api/setlists/${setlist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...setlist, songs: newOrder }),
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

  async function handleAiSubmit() {
    setAiLoading(true);
    setAiError('');
    try {
      // Parse input: satu lagu per baris, format: Judul - Artis (opsional)
      const lines = aiInput.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) throw new Error('Daftar lagu kosong');
      // Buat array objek lagu
      const songInputs = lines.map((line, idx) => {
        const [title, ...artistArr] = line.split(' - ');
        return { songId: `ai-${idx}`, title: title.trim(), artist: artistArr.join(' - ').trim() || undefined };
      });
      // Panggil API batch-search
      const res = await fetch('/api/ai/batch-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: songInputs })
      });
      const data = await res.json();
      if (!res.ok || !data.results) throw new Error(data.error || 'Gagal memproses AI');
      // Cocokkan hasil dengan lagu di database sesuai urutan input
      const matchedIds = [];
      const notFound = [];
      data.results.forEach((result, idx) => {
        if (result.error) return notFound.push(result.title);
        // Cari lagu di songs (by title & artist, case-insensitive)
        const match = songs.find(s =>
          s.title && result.title && s.title.toLowerCase() === result.title.toLowerCase() &&
          (!result.artist || (s.artist && s.artist.toLowerCase() === result.artist.toLowerCase()))
        );
        if (match) matchedIds.push(match.id);
        else notFound.push(result.title);
      });
      if (matchedIds.length === 0) throw new Error('Tidak ada lagu yang cocok ditemukan di database.');
      // Update setlist: urutkan sesuai input, lagu yang sudah ada tetap ikut urutan input
      setLocalOrder(matchedIds);
      if (setSetlists) {
        setSetlists(prev => prev.map(s => s.id === setlist.id ? { ...s, songs: matchedIds } : s));
      }
      await fetch(`/api/setlists/${setlist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...setlist, songs: matchedIds }),
      });
      setShowAiModal(false);
      setAiInput('');
      setAiError(notFound.length ? `Beberapa lagu tidak ditemukan: ${notFound.join(', ')}` : '');
    } catch (e) {
      setAiError(e.message || 'Gagal memproses AI');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <>
      <button className="back-btn" onClick={() => navigate('/setlists')}>&larr; Kembali ke daftar setlist</button>
      <div className="section-title">{setlist.name}</div>
      <div className="info-text info-spacing">
        {setlistSongs.length} Lagu
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <button className="tab-btn add-song-btn" onClick={() => setShowAddSong(true)} title="Tambah Lagu ke Setlist">
          <PlusIcon size={22} /> Tambah Lagu
        </button>
        <button className="tab-btn add-song-btn" style={{ background: '#ffe066', color: '#7c5700', borderColor: '#ffd700' }} onClick={() => setShowAiModal(true)} title="AI Setlist">
          🤖 AI Setlist
        </button>
        <button className="tab-btn add-song-btn" style={{ background: '#e0e7ff', color: '#3730a3', borderColor: '#6366f1' }} onClick={() => setShowShareModal(true)} title="Bagikan Setlist">
          📤 Bagikan
        </button>
      </div>
      {/* Generate share text and copy handler above return */}
      {showShareModal && (
        <div className="modal-overlay" onClick={e => { if (e.target.classList.contains('modal-overlay')) setShowShareModal(false); }}>
          <div className="modal add-song-modal">
            <div className="modal-title">Bagikan Setlist</div>
            <textarea
              className="search-input full-width mb-12"
              rows={Math.max(7, setlistSongs.length + 3)}
              value={shareText}
              readOnly
              style={{ fontFamily: 'inherit', fontSize: '1.05em', background: '#f3f4fa', color: '#23243a' }}
            />
            <button className="tab-btn" style={{ width: '100%', marginBottom: 8 }} onClick={handleCopyShare}>{shareCopied ? '✅ Tersalin!' : 'Salin Teks'}</button>
            <button className="back-btn mt-8" onClick={() => setShowShareModal(false)}>Tutup</button>
          </div>
        </div>
      )}
      {showAiModal && (
        <div className="modal-overlay" onClick={e => { if (e.target.classList.contains('modal-overlay')) setShowAiModal(false); }}>
          <div className="modal add-song-modal">
                  <div className="modal-title">AI: Susun Setlist Otomatis</div>
                  <textarea
                    className="search-input full-width mb-12"
                    rows={7}
                    placeholder="Masukkan daftar lagu, satu per baris. Bisa judul saja atau judul - artis.\nContoh:\nBintang Kehidupan\nSeparuh Aku - NOAH\n..."
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    autoFocus
                  />
                  {aiError && <div className="error-text mb-8">{aiError}</div>}
                  <button className="tab-btn" style={{ width: '100%', marginBottom: 8 }} onClick={handleAiSubmit} disabled={aiLoading || !aiInput.trim()}>{aiLoading ? 'Memproses...' : 'Susun & Tambah ke Setlist'}</button>
                  <button className="back-btn mt-8" onClick={() => setShowAiModal(false)}>Batal</button>
                </div>
              </div>
        )}

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
