
import SongList from '../components/SongList.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function SetlistSongsPage({ setlists, songs, setSetlists }) {
  const { setlistId } = useParams();
  const navigate = useNavigate();
  const setlist = setlists.find(s => String(s.id) === String(setlistId));
  const [localOrder, setLocalOrder] = useState(setlist ? [...(setlist.songs || [])] : []);
  if (!setlist) return <div className="main-content error-text">Setlist tidak ditemukan</div>;
  const setlistSongs = (localOrder || []).map(id => songs.find(song => song.id === id)).filter(Boolean);

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

  return (
    <>
      <button className="back-btn" onClick={() => navigate('/setlists')}>&larr; Kembali ke daftar setlist</button>
      <div className="section-title">{setlist.name}</div>
      <div className="info-text" style={{ marginTop: -12, marginBottom: 16, fontSize: '1.05em' }}>
        {setlistSongs.length} Lagu
      </div>
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
