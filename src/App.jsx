import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import SongListPage from './pages/SongListPage.jsx';
import SongLyricsPage from './pages/SongLyricsPage.jsx';
import SongAddEditPage from './pages/SongAddEditPage.jsx';
import SetlistPage from './pages/SetlistPage.jsx';
import NotFound from './components/NotFound.jsx';
import SetlistSongsPage from './pages/SetlistSongsPage.jsx';

function SetlistSongsRoute({ setlists, songs }) {
  return <SetlistSongsPage setlists={setlists} songs={songs} />;
}

function App() {
    // State untuk modal create setlist
    const [showCreateSetlist, setShowCreateSetlist] = useState(false);
    const [createSetlistName, setCreateSetlistName] = useState('');
    const [createSetlistError, setCreateSetlistError] = useState('');
  // Semua state harus dideklarasikan sebelum digunakan
  const [addSongError, setAddSongError] = useState('');
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
  // State untuk modal tambah lagu ke setlist
  const [showAddSongToSetlist, setShowAddSongToSetlist] = useState(false);
  const [addSongSearch, setAddSongSearch] = useState('');
  const [addSongSelectedId, setAddSongSelectedId] = useState(null);
  const addSongInputRef = useRef(null);
  // Filter lagu yang belum ada di setlist
  const availableSongsForSetlist = viewingSetlist
    ? songs.filter(song => !(viewingSetlist.songs || []).includes(song.id))
    : [];
  const filteredAvailableSongs = availableSongsForSetlist.filter(song =>
    (song.title || '').toLowerCase().includes(addSongSearch.toLowerCase()) ||
    (song.artist || '').toLowerCase().includes(addSongSearch.toLowerCase())
  );

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

  // Fetch setlists setiap kali route /setlists diakses
  useEffect(() => {
    if (window.location.pathname.startsWith('/setlists')) {
      setLoadingSetlists(true);
      fetch('/api/setlists')
        .then(res => { if (!res.ok) throw new Error('Gagal mengambil data setlist'); return res.json(); })
        .then(data => { setSetlists(Array.isArray(data) ? data : []); setLoadingSetlists(false); })
        .catch(err => { setErrorSetlists(err.message || 'Gagal mengambil data setlist'); setLoadingSetlists(false); });
    }
  }, [window.location.pathname]);

  const filteredSongs = songs.filter(song =>
    (song.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (song.artist || '').toLowerCase().includes(search.toLowerCase())
  );

  const navigate = useNavigate();

  // ...existing code...
  return (
    <>
      <header className="app-header">
        <h1 className="app-title" style={{fontSize: '1.5rem'}}>🎸 RoNz Chord</h1>
        <button
          className={theme === 'dark' ? 'theme-switch-btn dark' : 'theme-switch-btn light'}
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          title="Ganti mode gelap/terang"
        >
          {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <div className="tab-nav">
          <button onClick={() => navigate('/')} className={window.location.pathname === '/' ? 'tab-btn active' : 'tab-btn'}>Lagu</button>
          <button onClick={() => navigate('/setlists')} className={window.location.pathname.startsWith('/setlists') ? 'tab-btn active' : 'tab-btn'}>Setlist</button>
        </div>
      </header>
      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <SongListPage
                songs={filteredSongs}
                loading={loadingSongs}
                error={errorSongs}
                search={search}
                setSearch={setSearch}
                onSongClick={songOrAction => {
                  const from = window.location.pathname;
                  if (songOrAction === 'add') navigate('/songs/add', { state: { from } });
                  else if (songOrAction && songOrAction.id) navigate(`/songs/${songOrAction.id}`, { state: { from } });
                }}
              />
            }
          />
          <Route
            path="/songs/add"
            element={<AddSongRoute onSongUpdated={() => {
              navigate('/');
              setLoadingSongs(true);
              fetch('/api/songs')
                .then(res => res.json())
                .then(data => { setSongs(Array.isArray(data) ? data : []); setLoadingSongs(false); });
            }} />}
          />
          <Route
            path="/songs/:id/edit"
            element={<EditSongRoute onSongUpdated={() => {
              navigate('/');
              setLoadingSongs(true);
              fetch('/api/songs')
                .then(res => res.json())
                .then(data => { setSongs(Array.isArray(data) ? data : []); setLoadingSongs(false); });
            }} />}
          />

          <Route
            path="/songs/:id"
            element={<SongLyricsRoute />}
          />
          <Route
            path="/setlists"
            element={
              <SetlistPage
                setlists={setlists}
                viewingSetlist={viewingSetlist}
                setViewingSetlist={setViewingSetlist}
                songs={songs}
                showCreateSetlist={showCreateSetlist}
                setShowCreateSetlist={setShowCreateSetlist}
                createSetlistName={createSetlistName}
                setCreateSetlistName={setCreateSetlistName}
                createSetlistError={createSetlistError}
                setCreateSetlistError={setCreateSetlistError}
                loadingSetlists={loadingSetlists}
                errorSetlists={errorSetlists}
                showAddSongToSetlist={showAddSongToSetlist}
                setShowAddSongToSetlist={setShowAddSongToSetlist}
                addSongError={addSongError}
                setAddSongError={setAddSongError}
                addSongSearch={addSongSearch}
                setAddSongSearch={setAddSongSearch}
                addSongSelectedId={addSongSelectedId}
                setAddSongSelectedId={setAddSongSelectedId}
                addSongInputRef={addSongInputRef}
                filteredAvailableSongs={filteredAvailableSongs}
                setSetlists={setSetlists}
              />
            }
          />
          <Route
            path="/setlists/:setlistId/songs"
            element={<SetlistSongsRoute setlists={setlists} songs={songs} />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );

// Route wrapper for showing only lyrics and chord by id from URL
function SongLyricsRoute() {
  const { id } = useParams();
  const [song, setSong] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/songs/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Gagal mengambil data lagu');
        return res.json();
      })
      .then(data => { setSong(data); setLoading(false); })
      .catch(e => { setError(e.message || 'Gagal mengambil data'); setLoading(false); });
  }, [id]);
  if (loading) return <div className="main-content">Memuat data lagu...</div>;
  if (error) return <div className="main-content error-text">{error}</div>;
  return <SongLyricsPage song={song} />;
}

// Route wrapper for adding a song
function AddSongRoute({ onSongUpdated }) {
  const navigate = useNavigate();
  return (
    <SongAddEditPage
      mode="add"
      onBack={() => navigate('/')}
      onSongUpdated={onSongUpdated}
    />
  );
}

// Route wrapper for editing a song by id from URL
function EditSongRoute({ onSongUpdated }) {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <SongAddEditPage
      songId={id}
      mode="edit"
      onBack={() => navigate(`/songs/${id}`)}
      onSongUpdated={onSongUpdated}
    />
  );
}


}

export default App;
