import React from 'react';
import SongList from '../components/SongList.jsx';
import { useParams, useNavigate } from 'react-router-dom';

export default function SetlistSongsPage({ setlists, songs }) {
  const { setlistId } = useParams();
  const navigate = useNavigate();
  const setlist = setlists.find(s => String(s.id) === String(setlistId));
  if (!setlist) return <div className="main-content error-text">Setlist tidak ditemukan</div>;
  const setlistSongs = (setlist.songs || []).map(id => songs.find(song => song.id === id)).filter(Boolean);
  return (
    <div className="main-content">
      <button className="back-btn" onClick={() => navigate('/setlists')}>&larr; Kembali ke daftar setlist</button>
      <div className="section-title">Lagu dalam Setlist: {setlist.name}</div>
      <div className="info-text" style={{ marginTop: -12, marginBottom: 16, fontSize: '1.05em' }}>
        Jumlah lagu: {setlistSongs.length}
      </div>
      <SongList
        songs={setlistSongs}
        onSongClick={song => song && song.id && navigate(`/songs/${song.id}`)}
        emptyText="Setlist ini belum berisi lagu."
        showNumber={true}
      />
    </div>
  );
}
