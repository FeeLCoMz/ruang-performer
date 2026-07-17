import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function KaraokeSongSearch({ songs, setlistId = null, setlistName = '', setlistSongIds = [] }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const filtered = songs.filter(song =>
    song.title?.toLowerCase().includes(query.toLowerCase()) ||
    song.artist?.toLowerCase().includes(query.toLowerCase())
  );

  function handlePickSong(song) {
    const querySuffix = setlistId ? `?setlistId=${encodeURIComponent(setlistId)}` : '';
    navigate(`/karaoke/${song.id}${querySuffix}`, {
      state: setlistId
        ? {
            setlistId,
            setlistName,
            setlistSongIds,
            fromSetlist: true,
          }
        : undefined,
    });
  }

  return (
    <div className="karaoke-song-search">
      <input
        type="text"
        placeholder="Cari judul atau artis..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="search-input-main"
        style={{ width: 300, marginRight: 12 }}
      />
      {query && (
        <div className="karaoke-search-results">
          {filtered.length === 0 ? (
            <div className="karaoke-search-empty">Tidak ada lagu ditemukan</div>
          ) : (
            filtered.slice(0, 10).map(song => (
              <div
                key={song.id}
                className="karaoke-search-item"
                onClick={() => handlePickSong(song)}
                style={{ cursor: 'pointer', padding: '8px 0', borderBottom: '1px solid #eee' }}
              >
                <b>{song.title}</b> <span style={{ color: '#888' }}>({song.artist})</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
