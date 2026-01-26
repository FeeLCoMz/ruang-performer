import React, { useState, useEffect } from 'react';
import './App.css';
import SongList from './components/SongList.jsx';
import SongDetail from './components/SongDetail.jsx';
import EditSong from './components/EditSong.jsx';
import EditIcon from './components/EditIcon.jsx';

function App() {
  const [tab, setTab] = useState('songs');
  const [showAddSong, setShowAddSong] = useState(false);
  const [showEditSong, setShowEditSong] = useState(false);
  const [editSongId, setEditSongId] = useState(null);
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
  // State untuk setlist yang sedang dilihat di main content (tanpa fullscreen)
  const [viewingSetlist, setViewingSetlist] = useState(null);

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
            <div className="app-subtitle">Manajemen Chord, Lirik, & Setlist Lagu Modern</div>
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
            {tab === 'songs' && !showAddSong && (
              <>
                <div className="section-title">Lagu</div>
                <div className="info-text" style={{ marginTop: -12, marginBottom: 16, fontSize: '1.05em' }}>
                  Jumlah lagu: {filteredSongs.length}
                </div>
                <button className="tab-btn" style={{ marginBottom: 18 }} onClick={() => setShowAddSong(true)}>+ Tambah Lagu</button>
                <input
                  type="text"
                  placeholder="Cari judul atau artist..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="search-input"
                />
                {loadingSongs && <div className="info-text">Memuat daftar lagu...</div>}
                {errorSongs && <div className="error-text">{errorSongs}</div>}
                <SongList
                  songs={filteredSongs}
                  onSongClick={setSelectedSong}
                  emptyText="Tidak ada lagu ditemukan."
                />
              </>
            )}
            {tab === 'songs' && showAddSong && (
              <EditSong
                mode="add"
                onBack={() => setShowAddSong(false)}
                onSongUpdated={() => {
                  setShowAddSong(false);
                  setLoadingSongs(true);
                  fetch('/api/songs')
                    .then(res => res.json())
                    .then(data => { setSongs(Array.isArray(data) ? data : []); setLoadingSongs(false); });
                }}
              />
            )}
            {tab === 'setlists' && (
              <>
                <div className="section-title">Setlist</div>
                {viewingSetlist ? (
                  <>
                    <button className="back-btn" onClick={() => setViewingSetlist(null)}>&larr; Kembali ke daftar setlist</button>
                    <div className="section-title">{viewingSetlist.name}</div>
                    <div className="info-text" style={{ marginTop: -12, marginBottom: 16, fontSize: '1.05em' }}>
                      Jumlah lagu: {
                        (viewingSetlist.songs || [])
                          .map(id => songs.find(song => song.id === id))
                          .filter(Boolean).length
                      }
                    </div>
                    <SongList
                      songs={
                        (viewingSetlist.songs || [])
                          .map(id => songs.find(song => song.id === id))
                          .filter(Boolean)
                      }
                      onSongClick={song => {
                        const idx = (viewingSetlist.songs || []).findIndex(id => id === song.id);
                        setActiveSetlist(viewingSetlist);
                        setActiveSetlistSongIdx(idx >= 0 ? idx : 0);
                      }}
                      emptyText="Setlist ini belum berisi lagu."
                      enableSearch={true}
                      showNumber={true}
                      setlistSongKeys={
                        (viewingSetlist.songs || []).map((id, idx) => {
                          const songObj = songs.find(song => song.id === id);
                          if (!songObj) return null;
                          // If setlist has per-song key override, use it
                          if (viewingSetlist.songKeys && Array.isArray(viewingSetlist.songKeys)) {
                            const keyOverride = viewingSetlist.songKeys[idx];
                            if (keyOverride && typeof keyOverride === 'string' && keyOverride !== songObj.key) {
                              return { id, key: keyOverride };
                            }
                          }
                          return { id, key: null };
                        })
                      }
                    />
                  </>
                ) : (
                  <>
                    {loadingSetlists && <div className="info-text">Memuat setlist...</div>}
                    {errorSetlists && <div className="error-text">{errorSetlists}</div>}
                    <ul className="setlist-list">
                      {!loadingSetlists && !errorSetlists && setlists.length === 0 && (
                        <li className="info-text">Belum ada setlist.</li>
                      )}
                      {setlists.map(setlist => (
                        <li key={setlist.id} className="setlist-list-item" style={{ cursor: 'pointer' }} onClick={() => setViewingSetlist(setlist)}>
                          <span className="setlist-title">{setlist.name}</span>
                          <span className="setlist-count">{(setlist.songs?.length || 0)} lagu</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </main>
        </>
      )}
      {selectedSong && !showEditSong && (
        <SongDetail
          song={selectedSong}
          onBack={() => setSelectedSong(null)}
          transpose={transpose}
          setTranspose={setTranspose}
          highlightChords={highlightChords}
          setHighlightChords={setHighlightChords}
        >
          <div style={{ position: 'absolute', top: 24, right: 32, zIndex: 2 }}>
            <button
              className="tab-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontWeight: 500 }}
              onClick={() => {
                setEditSongId(selectedSong.id);
                setShowEditSong(true);
              }}
              title="Edit lagu"
            >
              <EditIcon size={18} style={{ verticalAlign: 'middle' }} />
              Edit Lagu
            </button>
          </div>
        </SongDetail>
      )}
      {showEditSong && editSongId && (
        <EditSong
          songId={editSongId}
          onBack={() => {
            setShowEditSong(false);
            setEditSongId(null);
          }}
          onSongUpdated={() => {
            setShowEditSong(false);
            setEditSongId(null);
            setSelectedSong(null);
            setLoadingSongs(true);
            fetch('/api/songs')
              .then(res => res.json())
              .then(data => { setSongs(Array.isArray(data) ? data : []); setLoadingSongs(false); });
          }}
        />
      )}
      {activeSetlist && (
        <SongDetail
          song={songs.find(s => s.id === activeSetlist.songs[activeSetlistSongIdx])}
          onBack={() => setActiveSetlist(null)}
          transpose={transpose}
          setTranspose={setTranspose}
          highlightChords={highlightChords}
          setHighlightChords={setHighlightChords}
          showNav={true}
          navIndex={activeSetlistSongIdx}
          navTotal={activeSetlist.songs?.length || 0}
          onPrev={() => setActiveSetlistSongIdx(idx => Math.max(0, idx - 1))}
          onNext={() => setActiveSetlistSongIdx(idx => Math.min((activeSetlist.songs?.length || 1) - 1, idx + 1))}
        />
      )}
    </>
  );
}

export default App;
