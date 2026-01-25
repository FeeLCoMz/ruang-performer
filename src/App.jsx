import React, { useState, useEffect } from 'react';
import './App.css';
import ChordDisplay from './components/ChordDisplay.jsx';
import SetListSongsPage from './components/SetListSongsPage.jsx';
import AutoScrollBar from './components/AutoScrollBar.jsx';
import YouTubeViewer from './components/YouTubeViewer.jsx';

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
  const [activeSetlist, setActiveSetlist] = useState(null);
  const [activeSetlistSongIdx, setActiveSetlistSongIdx] = useState(0);
  const [transpose, setTranspose] = useState(0);
  const [highlightChords, setHighlightChords] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ronz_theme') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    document.body.classList.remove('dark-mode', 'light-mode');
    document.body.classList.add(theme === 'dark' ? 'dark-mode' : 'light-mode');
    localStorage.setItem('ronz_theme', theme);
  }, [theme]);

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
    <>
      {!selectedSong && !activeSetlist && (
        <>
          <header className="app-header">
            <h1 className="app-title">🎸 RoNz Chord Pro</h1>
            <div className="app-subtitle">Aplikasi Chord & Lirik - Desain Baru</div>
            <button
              className={theme === 'dark' ? 'theme-switch-btn dark' : 'theme-switch-btn light'}
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              title="Ganti mode gelap/terang"
            >
              {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>
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
                      <button
                        className="aksi-btn"
                        style={{ marginLeft: 12 }}
                        onClick={() => {
                          setActiveSetlist(setlist);
                          setActiveSetlistSongIdx(0);
                        }}
                      >Tampil</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </main>
        </>
      )}
      {selectedSong && (
        <div className="song-detail-fullscreen">
          <button className="back-btn" onClick={() => setSelectedSong(null)}>&larr; Kembali ke daftar</button>
          <div className="transpose-bar">
            <button className="transpose-btn" onClick={() => setTranspose(t => t - 1)}>-</button>
            <span className="transpose-label">Transpose: {transpose >= 0 ? '+' : ''}{transpose}</span>
            <button className="transpose-btn" onClick={() => setTranspose(t => t + 1)}>+</button>
            <button
              className={highlightChords ? 'highlight-btn active' : 'highlight-btn'}
              onClick={() => setHighlightChords(h => !h)}
              title="Highlight chord/bar"
            >{highlightChords ? '🔆 Highlight ON' : '💡 Highlight'}</button>
          </div>
          {selectedSong.youtubeId && (
            <div className="youtube-viewer-wrapper">
              <YouTubeViewer videoId={selectedSong.youtubeId} />
            </div>
          )}
          <AutoScrollBar tempo={selectedSong.tempo ? Number(selectedSong.tempo) : 80} />
          <ChordDisplay song={selectedSong} transpose={transpose} highlightChords={highlightChords} />
        </div>
      )}
      {activeSetlist && (
        <div className="song-detail-fullscreen">
          <button className="back-btn" onClick={() => setActiveSetlist(null)}>&larr; Kembali ke setlist</button>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, marginBottom: 18 }}>
            <button
              className="aksi-btn"
              disabled={activeSetlistSongIdx <= 0}
              onClick={() => setActiveSetlistSongIdx(idx => Math.max(0, idx - 1))}
            >⟨ Sebelumnya</button>
            <span style={{ fontWeight: 700, fontSize: '1.1em' }}>
              {activeSetlist.songs && activeSetlist.songs.length > 0
                ? `${activeSetlistSongIdx + 1} / ${activeSetlist.songs.length}`
                : '0 / 0'}
            </span>
            <button
              className="aksi-btn"
              disabled={activeSetlistSongIdx >= (activeSetlist.songs?.length || 1) - 1}
              onClick={() => setActiveSetlistSongIdx(idx => Math.min((activeSetlist.songs?.length || 1) - 1, idx + 1))}
            >Berikutnya ⟩</button>
          </div>
          <div className="transpose-bar">
            <button className="transpose-btn" onClick={() => setTranspose(t => t - 1)}>-</button>
            <span className="transpose-label">Transpose: {transpose >= 0 ? '+' : ''}{transpose}</span>
            <button className="transpose-btn" onClick={() => setTranspose(t => t + 1)}>+</button>
            <button
              className={highlightChords ? 'highlight-btn active' : 'highlight-btn'}
              onClick={() => setHighlightChords(h => !h)}
              title="Highlight chord/bar"
            >{highlightChords ? '🔆 Highlight ON' : '💡 Highlight'}</button>
          </div>
          {(() => {
            const song = songs.find(s => s.id === activeSetlist.songs[activeSetlistSongIdx]);
            return song && song.youtubeId ? (
              <div className="youtube-viewer-wrapper">
                <YouTubeViewer videoId={song.youtubeId} />
              </div>
            ) : null;
          })()}
          <AutoScrollBar tempo={(() => {
            const song = songs.find(s => s.id === activeSetlist.songs[activeSetlistSongIdx]);
            return song && song.tempo ? Number(song.tempo) : 80;
          })()} />
          <ChordDisplay song={songs.find(s => s.id === activeSetlist.songs[activeSetlistSongIdx])} transpose={transpose} highlightChords={highlightChords} />
        </div>
      )}
    </>
  );
}

export default App;
