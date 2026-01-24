import React, { useState, useEffect } from 'react';
import './App.css';
import ChordDisplay from './components/ChordDisplay.jsx';

function App() {
  const [tab, setTab] = useState('songs');
  const [songs, setSongs] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [loadingSetlists, setLoadingSetlists] = useState(false);
  const [errorSongs, setErrorSongs] = useState(null);
  const [errorSetlists, setErrorSetlists] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);

  useEffect(() => {
    setLoadingSongs(true);
    fetch('/api/songs')
      .then(res => { if (!res.ok) throw new Error('Gagal mengambil data lagu'); return res.json(); })
      .then(data => { setSongs(Array.isArray(data) ? data : []); setLoadingSongs(false); })
      .catch(err => { setErrorSongs(err.message || 'Gagal mengambil data'); setLoadingSongs(false); });
  }, []);

  useEffect(() => {
    if (tab === 'setlists') {
      setLoadingSetlists(true);
      fetch('/api/setlists')
        .then(res => { if (!res.ok) throw new Error('Gagal mengambil data setlist'); return res.json(); })
        .then(data => { setSetlists(Array.isArray(data) ? data : []); setLoadingSetlists(false); })
        .catch(err => { setErrorSetlists(err.message || 'Gagal mengambil data setlist'); setLoadingSetlists(false); });
    }
  }, [tab]);

  const filteredSongs = songs.filter(song =>
    (song.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (song.artist || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-blank-layout">
      <header className="app-header">
        <h1 className="app-title">🎸 RoNz Chord Pro</h1>
        <div className="app-subtitle">Aplikasi Chord & Lirik - Desain Baru</div>
        <div className="tab-nav">
          <button onClick={() => setTab('songs')} className={tab === 'songs' ? 'tab-btn active' : 'tab-btn'}>Lagu</button>
          <button onClick={() => setTab('setlists')} className={tab === 'setlists' ? 'tab-btn active' : 'tab-btn'}>Setlist</button>
        </div>
      </header>
      <main className="main-content">
        {tab === 'songs' && (
          <>
            <div className="section-title">Lagu</div>
            <input
              type="text"
              placeholder="Cari judul atau artist..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
            {loadingSongs && <div className="info-text">Memuat daftar lagu...</div>}
            {errorSongs && <div className="error-text">{errorSongs}</div>}
            {!selectedSong ? (
              <ul className="song-list">
                {!loadingSongs && !errorSongs && filteredSongs.length === 0 && (
                  <li className="info-text">Tidak ada lagu ditemukan.</li>
                )}
                {filteredSongs.map(song => (
                  <li
                    key={song.id}
                    className="song-list-item"
                    onClick={() => setSelectedSong(song)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="song-title">{song.title}</span>
                    <span className="song-artist">{song.artist}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="song-detail-view">
                <button className="back-btn" onClick={() => setSelectedSong(null)}>&larr; Kembali ke daftar</button>
                <ChordDisplay song={selectedSong} />
              </div>
            )}
          </>
        )}
        {tab === 'setlists' && (
          <>
            <div className="section-title">Setlist</div>
            {loadingSetlists && <div className="info-text">Memuat setlist...</div>}
            {errorSetlists && <div className="error-text">{errorSetlists}</div>}
            <ul className="setlist-list">
              {!loadingSetlists && !errorSetlists && setlists.length === 0 && (
                <li className="info-text">Belum ada setlist.</li>
              )}
              {setlists.map(setlist => (
                <li key={setlist.id} className="setlist-list-item">
                  <span className="setlist-title">{setlist.name}</span>
                  <span className="setlist-count">{(setlist.songs?.length || 0)} lagu</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
