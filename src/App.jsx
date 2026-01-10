import SettingsModal from './components/SettingsModal';
// ...existing code...

// Render SettingsModal di dalam return utama
import React, { useState, useRef, useEffect } from 'react';
import ChordDisplay from './components/ChordDisplay';
import YouTubeViewer from './components/YouTubeViewer';
import AutoScroll from './components/AutoScroll';

import SetListManager from './components/SetListManager';
import HelpModal from './components/HelpModal';
import SongFormBaru from './components/SongForm';
import SongListItem from './components/SongListItem';
import { initialSongs, initialSetLists } from './data/songs';
import './App.css';

function sanitizeSongs(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(Boolean)
    .filter(item => item.title?.trim() && item.artist?.trim() && item.lyrics?.trim())
    .map(item => ({
      ...item,
      title: item.title.trim(),
      artist: item.artist.trim(),
      lyrics: item.lyrics.trim()
    }));
}

function sanitizeSetLists(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(Boolean)
    .map(sl => ({
      ...sl,
      songs: Array.isArray(sl.songs) ? sl.songs.filter(Boolean) : []
    }));
}

function App() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showLyricsFullscreen, setShowLyricsFullscreen] = useState(false);
  const [activeNav, setActiveNav] = useState('songs'); // 'songs' atau 'setlists'
  // Cek localStorage saat inisialisasi
  const getInitialSongs = () => {
    try {
      const data = localStorage.getItem('ronz_songs');
      if (data) {
        const parsed = sanitizeSongs(JSON.parse(data));
        if (parsed.length > 0) return parsed;
      }
    } catch { }
    // Fallback ke seed bawaan agar sidebar tidak kosong/blank
    return sanitizeSongs(initialSongs);
  };
  const getInitialSetLists = () => {
    try {
      const data = localStorage.getItem('ronz_setlists');
      if (data) {
        const parsed = sanitizeSetLists(JSON.parse(data));
        if (parsed.length > 0) return parsed;
      }
    } catch { }
    return sanitizeSetLists(initialSetLists);
  };
  const [songs, setSongs] = useState(getInitialSongs);
  const [setLists, setSetLists] = useState(getInitialSetLists);
  const [selectedSong, setSelectedSong] = useState(null);
  const [transpose, setTranspose] = useState(0);
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [showYouTube, setShowYouTube] = useState(false);
  const [currentSetList, setCurrentSetList] = useState(null);
  const [showSongForm, setShowSongForm] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [showSetListManager, setShowSetListManager] = useState(false);
  const [showSetListMenu, setShowSetListMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingToDb, setSyncingToDb] = useState(false);
  const [runtimeErrors, setRuntimeErrors] = useState([]);
  const [sortBy, setSortBy] = useState('title-asc');
  const [selectedSetListsForAdd, setSelectedSetListsForAdd] = useState([]);
  const [showSetListPopup, setShowSetListPopup] = useState(false);
  // const [showSidebarNav, setShowSidebarNav] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const scrollRef = useRef(null);
  const isInitialLoad = useRef(true);

  // Saat online/load, merge data backend dan lokal berdasarkan updatedAt
  useEffect(() => {
    if (navigator.onLine) {
      Promise.all([
        fetch('/api/songs').then(res => res.json()),
        fetch('/api/setlists').then(res => res.json())
      ])
        .then(([songsData, setlistsData]) => {
          // Merge songs
          if (Array.isArray(songsData)) {
            const remoteSongs = sanitizeSongs(songsData);
            setSongs(prev => {
              const merged = [...sanitizeSongs(prev)];
              remoteSongs.forEach(remote => {
                const localIdx = merged.findIndex(s => s.id === remote.id);
                if (localIdx > -1) {
                  merged[localIdx] = (remote.updatedAt > (merged[localIdx].updatedAt || 0)) ? remote : merged[localIdx];
                } else {
                  merged.push(remote);
                }
              });
              return merged;
            });
          }
          // Merge setlists
          if (Array.isArray(setlistsData)) {
            const remoteSetlists = sanitizeSetLists(setlistsData);
            setSetLists(prev => {
              const merged = [...sanitizeSetLists(prev)];
              remoteSetlists.forEach(remote => {
                const localIdx = merged.findIndex(s => s.id === remote.id);
                if (localIdx > -1) {
                  merged[localIdx] = (remote.updatedAt > (merged[localIdx].updatedAt || 0)) ? remote : merged[localIdx];
                } else {
                  merged.push(remote);
                }
              });
              return merged;
            });
          }
        })
        .catch(err => console.warn('Failed to fetch from Turso:', err));
    }
    // eslint-disable-next-line
  }, []);

  // Simpan otomatis ke localStorage setiap ada perubahan
  useEffect(() => {
    try {
      localStorage.setItem('ronz_songs', JSON.stringify(songs));
    } catch { }
    // Push ke backend jika online
    if (navigator.onLine && songs.length > 0) {
      fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(songs)
      }).catch(() => { });
    }
  }, [songs]);
  useEffect(() => {
    try {
      localStorage.setItem('ronz_setlists', JSON.stringify(setLists));
    } catch { }
    // Push changes ke backend jika online (hanya untuk setlist yang berubah/baru)
    if (navigator.onLine && setLists.length > 0) {
      setLists.forEach(setList => {
        fetch(`/api/setlists/${setList.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setList)
        }).catch(() => { });
      });
    }
  }, [setLists]);

  // Collect runtime errors without killing the UI
  useEffect(() => {
    const handleError = (event) => {
      const message = event?.message || event?.reason?.message || 'Unknown error';
      const detail = event?.error?.stack || event?.reason?.stack || '';
      setRuntimeErrors(prev => {
        const next = [{ id: Date.now(), message, detail }, ...prev];
        return next.slice(0, 4);
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  const dismissError = (id) => {
    setRuntimeErrors(prev => prev.filter(err => err.id !== id));
  };

  const handleTranspose = (value) => {
    setTranspose(prev => {
      const newValue = prev + value;
      if (newValue > 11) return newValue - 12;
      if (newValue < -11) return newValue + 12;
      return newValue;
    });
  };

  const handleSelectSong = (song) => {
    setSelectedSong(song);
    setTranspose(0);
  };

  const handleSaveSong = (songData) => {
    const isEditMode = !!editingSong;
    const songId = isEditMode ? editingSong.id : Date.now().toString();
    const now = Date.now();
    const updatedSong = { ...songData, id: songId, updatedAt: now };
    setSongs(prevSongs => {
      const existingIndex = prevSongs.findIndex(s => s.id === songId);
      if (existingIndex > -1) {
        // Update existing song
        const newSongs = [...prevSongs];
        newSongs[existingIndex] = updatedSong;
        return newSongs;
      } else {
        // Add new song
        return [...prevSongs, updatedSong];
      }
    });
    setSelectedSong(updatedSong);
    setTranspose(0);
    setAutoScrollActive(false);
    setShowSongForm(false);
    setEditingSong(null);
  };

  const handleCreateSetList = (name) => {
    const now = Date.now();
    const newSetList = {
      id: now.toString(),
      name,
      songs: [],
      createdAt: new Date().toISOString(),
      updatedAt: now
    };
    setSetLists(prevSetLists => [...prevSetLists, newSetList]);
    setCurrentSetList(newSetList.id);
    setShowSetListManager(false);
  };

  const handleDeleteSetList = async (id) => {
    if (!confirm('Hapus setlist ini?')) return;
    setSetLists(prevSetLists => prevSetLists.filter(sl => sl.id !== id));
    setCurrentSetList(null);

    try {
      await fetch(`/api/setlists/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Gagal menghapus setlist:', err);
    }
  };

  const handleAddSongToSetList = async (setListId, songId) => {
    let updatedSetList = null;
    setSetLists(prevSetLists => {
      return prevSetLists.map(setList => {
        if (setList.id === setListId && !setList.songs.includes(songId)) {
          const next = { ...setList, songs: [...setList.songs, songId], updatedAt: Date.now() };
          updatedSetList = next;
          return next;
        }
        return setList;
      });
    });
    if (updatedSetList) {
      try {
        await fetch(`/api/setlists/${setListId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: updatedSetList.name, songs: updatedSetList.songs, updatedAt: updatedSetList.updatedAt })
        });
      } catch (err) {
        console.error('Gagal menambah lagu ke setlist:', err);
      }
    }
  };

  const handleRemoveSongFromSetList = async (setListId, songId) => {
    let updatedSetList = null;
    setSetLists(prevSetLists => {
      return prevSetLists.map(setList => {
        if (setList.id === setListId) {
          const next = { ...setList, songs: setList.songs.filter(id => id !== songId), updatedAt: Date.now() };
          updatedSetList = next;
          return next;
        }
        return setList;
      });
    });
    if (updatedSetList) {
      try {
        await fetch(`/api/setlists/${setListId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: updatedSetList.name, songs: updatedSetList.songs, updatedAt: updatedSetList.updatedAt })
        });
      } catch (err) {
        console.error('Gagal menghapus lagu dari setlist:', err);
      }
    }
  };

  const handleEditSong = (song) => {
    setEditingSong(song);
    setShowSongForm(true);
  };

  const handleDeleteSong = (songId) => {
    if (!confirm('Hapus lagu ini?')) return;
    setSongs(prevSongs => prevSongs.filter(s => s.id !== songId));
    if (selectedSong?.id === songId) {
      setSelectedSong(null);
    }
  };

  const handleSyncToDatabase = async () => {
    if (songs.length === 0) {
      alert('Tidak ada lagu untuk disinkronkan.');
      return;
    }

    setSyncingToDb(true);
    try {
      const response = await fetch('/api/songs/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Sync gagal');
      }

      alert(`Sync selesai. ${result.inserted || 0} disisipkan, ${result.updated || 0} diperbarui.`);
    } catch (error) {
      console.error('Sync error:', error);
      alert('Gagal sync ke database. Coba lagi nanti.');
    } finally {
      setSyncingToDb(false);
    }
  };

  const handleExportDatabase = () => {
    const data = {
      songs,
      setLists,
      exportDate: new Date().toISOString(),
      version: '2.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ronz-chordpro-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleImportDatabase = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (!data.songs || !Array.isArray(data.songs)) {
          alert('Format file tidak valid');
          return;
        }

        if (confirm(`Import ${data.songs.length} lagu dan ${data.setLists?.length || 0} set list?\\n\\nSemua data akan digantikan.`)) {
          setSongs(data.songs);
          if (data.setLists) setSetLists(data.setLists);
          if (data.songs.length > 0) setSelectedSong(data.songs[0]);
          setCurrentSetList(null);
          setTranspose(0);
          alert('Import berhasil!');
        }
      } catch (error) {
        alert('Gagal membaca file. Pastikan file JSON valid.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Get display songs
  const getDisplaySongs = () => {
    let base = songs;
    if (currentSetList) {
      const setList = setLists.find(sl => sl.id === currentSetList);
      if (setList) {
        base = setList.songs.map(id => songs.find(s => s.id === id)).filter(Boolean);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.artist?.toLowerCase().includes(q) ||
        s.lyrics?.toLowerCase().includes(q)
      );
    }

    // Apply sorting
    const sorted = [...base];
    switch (sortBy) {
      case 'title-asc':
        sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'title-desc':
        sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        break;
      case 'artist-asc':
        sorted.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
        break;
      case 'newest':
        sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        break;
      default:
        break;
    }
    return sorted;
  };

  const displaySongs = getDisplaySongs();
  const currentSetListName = currentSetList
    ? setLists.find(sl => sl.id === currentSetList)?.name
    : 'Semua Lagu';

  return (
    <>
      {showSettingsMenu && (
        <SettingsModal
          onClose={() => setShowSettingsMenu(false)}
          onExport={handleExportDatabase}
          onImport={handleImportDatabase}
          onSync={handleSyncToDatabase}
          syncingToDb={syncingToDb}
        />
      )}
      <div className="app">
        <header className="header">
          <div className="header-content">
            <h1>🎸 RoNz Chord Pro</h1>
            <p>Professional Chord & Lyrics App</p>
          </div>
        </header>

        <div className="container">
          <nav className="nav-panel">
            <button
              className={`nav-btn ${activeNav === 'songs' ? 'active' : ''}`}
              onClick={() => setActiveNav('songs')}
            >
              📋 Daftar Lagu
            </button>
            <button
              className={`nav-btn ${activeNav === 'setlists' ? 'active' : ''}`}
              onClick={() => setActiveNav('setlists')}
            >
              🎵 Setlist
            </button>
            <button
              className="nav-btn"
              onClick={() => setShowSettingsMenu(true)}
              style={{ marginLeft: 'auto' }}
              title="Pengaturan"
            >
              ⚙️
            </button>
          </nav>

          <div className="content-wrapper">
            {/* Left Panel - Songs or Setlists */}
            <aside className="left-panel">
              {activeNav === 'songs' && (
                <div className="songs-panel">
                  <div className="panel-header">
                    <button onClick={() => setShowSongForm(true)} className="btn btn-sm btn-primary" style={{ width: '100%' }}>
                      ➕ Tambah Lagu
                    </button>
                  </div>
                  <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari lagu..."
                      aria-label="Cari lagu"
                    />
                  </div>
                  <div className="sort-box">
                    <select
                      className="setlist-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="title-asc">📋 Judul A-Z</option>
                      <option value="title-desc">📋 Judul Z-A</option>
                      <option value="artist-asc">🎤 Artis A-Z</option>
                      <option value="newest">🕒 Terbaru</option>
                    </select>
                  </div>
                  <div className="songs-list">
                    {displaySongs.length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                        {songs.length === 0 ? 'Tidak ada lagu. Klik ➕ untuk tambah.' : 'Tidak ada hasil pencarian.'}
                      </div>
                    ) : (
                      displaySongs.map(song => (
                        <SongListItem
                          key={song.id}
                          song={song}
                          isActive={selectedSong?.id === song.id}
                          onSelect={() => handleSelectSong(song)}
                          onEdit={() => handleEditSong(song)}
                          onDelete={() => handleDeleteSong(song.id)}
                          setLists={setLists}
                          onAddToSetLists={slIds => slIds.forEach(slId => handleAddSongToSetList(slId, song.id))}
                          onRemoveFromSetList={handleRemoveSongFromSetList}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeNav === 'setlists' && (
                <div className="setlists-panel">
                  <div className="panel-header">
                    <button onClick={() => setShowSetListMenu(true)} className="btn btn-sm btn-primary" style={{ width: '100%' }}>
                      ➕ Buat Setlist
                    </button>
                  </div>
                  <div className="setlists-list">
                    {setLists.length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                        Tidak ada setlist. Klik ➕ untuk membuat.
                      </div>
                    ) : (
                      setLists.map(setList => (
                        <div
                          key={setList.id}
                          className={`setlist-item ${currentSetList === setList.id ? 'active' : ''}`}
                          onClick={() => setCurrentSetList(setList.id)}
                        >
                          <div className="setlist-info">
                            <div className="setlist-name">📋 {setList.name}</div>
                            <div className="setlist-count">{setList.songs?.length || 0} lagu</div>
                          </div>
                          <button
                            className="btn btn-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSetListMenu(true);
                            }}
                            title="Edit"
                          >
                            ✎
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </aside>

            {/* Right Panel - Main Content */}
            <main className="main">
              <>
                {selectedSong && (
                  <div className="controls controls-compact">
                    {/* Transpose Group */}
                    <button onClick={() => handleTranspose(-1)} className="btn btn-xs" title="Transpose turun (♭)">♭</button>
                    <span className="transpose-value" style={{ minWidth: 32, textAlign: 'center' }} title="Nilai transpose">{transpose > 0 ? `+${transpose}` : transpose}</span>
                    <button onClick={() => handleTranspose(1)} className="btn btn-xs" title="Transpose naik (♯)">♯</button>
                    <button onClick={() => setTranspose(0)} className="btn btn-xs" title="Reset transpose">⟳</button>
                    <span className="divider" />
                    {/* Auto Scroll Group */}
                    <button
                      onClick={() => setAutoScrollActive(!autoScrollActive)}
                      className={`btn btn-xs ${autoScrollActive ? 'btn-primary' : ''}`}
                      title={autoScrollActive ? 'Matikan Auto Scroll' : 'Aktifkan Auto Scroll'}
                    >
                      {autoScrollActive ? '⏸' : '▶'}
                    </button>
                    {autoScrollActive && (
                      <>
                        <button onClick={() => setScrollSpeed(Math.max(0.5, scrollSpeed - 0.5))} className="btn btn-xs" title="Kurangi kecepatan scroll">−</button>
                        <span className="speed-value" style={{ minWidth: 28, textAlign: 'center' }} title="Kecepatan scroll">{scrollSpeed.toFixed(1)}x</span>
                        <button onClick={() => setScrollSpeed(Math.min(5, scrollSpeed + 0.5))} className="btn btn-xs" title="Tambah kecepatan scroll">+</button>
                      </>
                    )}
                    <span className="divider" />
                    {/* YouTube Toggle */}
                    <button
                      onClick={() => setShowYouTube(!showYouTube)}
                      className={`btn btn-xs ${showYouTube ? 'btn-primary' : ''}`}
                      title={showYouTube ? 'Sembunyikan YouTube' : 'Tampilkan YouTube'}
                    >
                      📺
                    </button>
                  </div>
                )}
                {showYouTube && selectedSong?.youtubeId && (
                  <div className="youtube-section">
                    <YouTubeViewer videoId={selectedSong.youtubeId} />
                  </div>
                )}
                {/* Tombol fullscreen dan lirik fullscreen */}
                <div className="lyrics-section" ref={scrollRef}>
                  {selectedSong ? (
                    <ChordDisplay song={selectedSong} transpose={transpose} />
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                      <h3>Pilih lagu dari daftar untuk melihat chord dan lirik</h3>
                    </div>
                  )}
                </div>
                <AutoScroll
                  isActive={autoScrollActive}
                  speed={scrollSpeed}
                  scrollRef={scrollRef}
                />
              </>
            </main>
          </div>
        </div>

        {showSongForm && (
          <SongFormBaru
            song={editingSong}
            onSave={handleSaveSong}
            onCancel={() => {
              setShowSongForm(false);
              setEditingSong(null);
            }}
          />
        )}

        {showSetListMenu && (
          <SetListManager
            setLists={setLists}
            songs={songs}
            onCreateSetList={handleCreateSetList}
            onDeleteSetList={handleDeleteSetList}
            onAddSongToSetList={handleAddSongToSetList}
            onRemoveSongFromSetList={handleRemoveSongFromSetList}
            onSelectSetList={(id) => {
              setCurrentSetList(id);
              setShowSetListMenu(false);
            }}
          />
        )}

        {showSetListPopup && (
          <div className="setlist-popup-overlay" onClick={() => setShowSetListPopup(false)}>
            <div className="setlist-popup" onClick={(e) => e.stopPropagation()}>
              <div className="setlist-popup-header">
                <h3>Pilih Setlist</h3>
                <button className="btn-close" onClick={() => setShowSetListPopup(false)}>
                  ✕
                </button>
              </div>
              <div className="setlist-popup-body">
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Pilih setlist, lalu klik tombol ➕ pada lagu untuk menambahkannya.
                </p>
                <div className="setlist-checkboxes">
                  {setLists.map(sl => (
                    <label key={sl.id} className="setlist-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedSetListsForAdd.includes(sl.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSetListsForAdd(prev => [...prev, sl.id]);
                          } else {
                            setSelectedSetListsForAdd(prev => prev.filter(id => id !== sl.id));
                          }
                        }}
                      />
                      <span>{sl.name}</span>
                    </label>
                  ))}
                </div>
                {selectedSetListsForAdd.length > 0 && (
                  <button
                    className="btn btn-sm btn-block btn-primary"
                    onClick={() => setShowSetListPopup(false)}
                    style={{ marginTop: '1rem' }}
                  >
                    Selesai ({selectedSetListsForAdd.length} dipilih)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showHelp && (
          <HelpModal
            onClose={() => setShowHelp(false)}
          />
        )}

        {runtimeErrors.length > 0 && (
          <div
            style={{
              position: 'fixed',
              bottom: '1rem',
              right: '1rem',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              maxWidth: '420px'
            }}
          >
            {runtimeErrors.map(err => (
              <div
                key={err.id}
                style={{
                  background: 'rgba(31, 41, 55, 0.95)',
                  color: '#f8fafc',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  boxShadow: '0 12px 24px -6px rgba(0,0,0,0.6)',
                  borderRadius: '10px',
                  padding: '0.9rem 1rem',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                  <strong style={{ color: '#f472b6' }}>Error</strong>
                  <button
                    onClick={() => dismissError(err.id)}
                    style={{
                      background: 'transparent',
                      color: '#e2e8f0',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ marginTop: '0.25rem', fontSize: '0.95rem', color: '#e2e8f0' }}>
                  {err.message}
                </div>
                {err.detail && (
                  <pre
                    style={{
                      marginTop: '0.5rem',
                      maxHeight: '160px',
                      overflow: 'auto',
                      fontSize: '0.75rem',
                      color: '#cbd5e1',
                      background: 'rgba(15, 23, 42, 0.7)',
                      padding: '0.5rem',
                      borderRadius: '6px'
                    }}
                  >
                    {err.detail}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default App;
