
import React, { useState } from 'react';

function SongList({ songs, onSongClick, emptyText = 'Tidak ada lagu ditemukan.', enableSearch = false, showNumber = false, setlistSongKeys = null }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [sortOrder, setSortOrder] = useState('asc');
  let filteredSongs = enableSearch
    ? (songs || []).filter(song =>
              (song.title || '').toLowerCase().includes(search.toLowerCase()) ||
              (song.artist || '').toLowerCase().includes(search.toLowerCase())
      )
    : songs;

  // Sorting logic
  if (sortBy !== 'default') {
    filteredSongs = [...filteredSongs].sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Dropdown sort
  const sortOptions = [
    { value: 'default', label: 'Urutan Asli' },
    { value: 'title', label: 'Judul' },
    { value: 'artist', label: 'Artist' },
    { value: 'key', label: 'Key' },
    { value: 'tempo', label: 'Tempo' },
    { value: 'style', label: 'Style' },
  ];

  // UI jika kosong
  if (!filteredSongs || filteredSongs.length === 0) {
    return (
      <>
        {enableSearch && (
          <input
            type="text"
            placeholder="Cari judul atau artist..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
            style={{ marginBottom: 18 }}
          />
        )}
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="search-input" style={{ width:150 }}>
            {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          {sortBy !== 'default' && (
            <button className="tab-btn" style={{ padding:'6px 10px' }} onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? '⬆️' : '⬇️'}
            </button>
          )}
        </div>
        <ul className="song-list"><li className="info-text">{emptyText}</li></ul>
      </>
    );
  }

  return (
    <>
      {enableSearch && (
        <input
          type="text"
          placeholder="Cari judul atau artist..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
          style={{ marginBottom: 18 }}
        />
      )}
      <div style={{ display:'flex', gap:10, marginBottom:12 }}>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="search-input" style={{ width:150 }}>
          {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        {sortBy !== 'default' && (
          <button className="tab-btn" style={{ padding:'6px 10px' }} onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
            {sortOrder === 'asc' ? '⬆️' : '⬇️'}
          </button>
        )}
      </div>
            <ul className="song-list">
              {(filteredSongs || []).map((song, idx) => {
                // If setlistSongKeys is provided, use the override key for this song if available
                let keyOverride = null;
                if (setlistSongKeys && setlistSongKeys[idx] && setlistSongKeys[idx].id === song.id) {
                  keyOverride = setlistSongKeys[idx].key;
                }
                return (
                  <li
                    key={song.id}
                    className={
                      'song-list-item' +
                      (showNumber ? ' song-list-item--with-number' : '')
                    }
                    onClick={() => onSongClick && onSongClick(song)}
                  >
                    {showNumber && (
                      <span className="song-number-badge">{idx + 1}</span>
                    )}
                    <div style={{ marginLeft: showNumber ? 38 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
                        <div style={{ flex: 1 }}>
                          <span className="song-title" style={{ display: 'block', fontSize: '1.13em', fontWeight: 700 }}>{song.title}</span>
                          <span className="song-artist" style={{ display: 'block', fontSize: '0.98em', color: 'var(--text-muted)' }}>{song.artist}</span>
                        </div>
                      </div>
                      <div className="song-info-row" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 6, fontSize: '0.97em', color: 'var(--primary-accent-dark, #a5b4fc)' }}>
                        <span>
                          <strong>Key:</strong> {keyOverride ? (
                            <>
                              <span style={{ color: 'var(--primary-accent)' }}>{keyOverride}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.97em', marginLeft: 4 }}>
                                ({song.key || '-'})
                              </span>
                            </>
                          ) : (song.key || '-')}
                        </span>
                        <span><strong>Tempo:</strong> {song.tempo ? song.tempo + ' bpm' : '-'}</span>
                        <span><strong>Style:</strong> {song.style || '-'}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
    </>
  );
}

export default SongList;
