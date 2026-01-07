import React, { useState, useRef, useEffect } from 'react';
import ChordDisplay from './components/ChordDisplay';
import YouTubeViewer from './components/YouTubeViewer';
import AutoScroll from './components/AutoScroll';

import SetListManager from './components/SetListManager';
import SongFormBaru from './components/SongForm';
import { initialSongs, initialSetLists } from './data/songs';
import './App.css';

function App() {
  const [songs, setSongs] = useState([]);
  const [setLists, setSetLists] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [transpose, setTranspose] = useState(0);
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [showYouTube, setShowYouTube] = useState(false);
  const [currentSetList, setCurrentSetList] = useState(null);
  const [showSongForm, setShowSongForm] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [showSetListManager, setShowSetListManager] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingToDb, setSyncingToDb] = useState(false);
  const [runtimeErrors, setRuntimeErrors] = useState([]);
  const [sortBy, setSortBy] = useState('title-asc');
  const [lyricsPreview, setLyricsPreview] = useState('');
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState('');
  const [selectedSetListsForAdd, setSelectedSetListsForAdd] = useState([]);
  const scrollRef = useRef(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/songs').then(res => res.json()),
      fetch('/api/setlists').then(res => res.json())
    ])
      .then(([songsData, setlistsData]) => {
        if (Array.isArray(songsData) && songsData.length > 0) {
          setSongs(songsData);
          setSelectedSong(songsData[0]);
        }
        if (Array.isArray(setlistsData) && setlistsData.length > 0) {
          setSetLists(setlistsData);
        }
      })
      .catch(err => console.warn('Failed to fetch from Turso:', err));
  }, []);

  // Fetch quick lyrics preview when song changes (best-effort, non-blocking)
  useEffect(() => {
    if (!selectedSong?.title) {
      setLyricsPreview('');
      setLyricsError('');
      return;
    }

    const controller = new AbortController();
    const query = encodeURIComponent(`${selectedSong.title} ${selectedSong.artist || ''}`.trim());
    const url = `https://lyrist.vercel.app/api/${query}`;

    setLyricsLoading(true);
    setLyricsError('');
    fetch(url, { signal: controller.signal })
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Gagal mengambil lirik otomatis')))
      .then(data => {
        setLyricsPreview(data?.lyrics || '');
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setLyricsPreview('');
        setLyricsError('Lirik otomatis tidak tersedia');
      })
      .finally(() => {
        setLyricsLoading(false);
      });

    return () => controller.abort();
  }, [selectedSong?.id, selectedSong?.title, selectedSong?.artist]);

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
    const updatedSong = { ...songData, id: songId };
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

  const handleCreateSetList = async (name) => {
    const newSetList = {
      id: Date.now(),
      name,
      songs: [],
      createdAt: new Date().toISOString()
    };
    setSetLists(prevSetLists => [...prevSetLists, newSetList]);
    setCurrentSetList(newSetList.id);
    setShowSetListManager(false);

    try {
      await fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSetList)
      });
    } catch (err) {
      console.error('Gagal menyimpan setlist baru:', err);
    }
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
          const next = { ...setList, songs: [...setList.songs, songId] };
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
          body: JSON.stringify({ name: updatedSetList.name, songs: updatedSetList.songs })
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
          const next = { ...setList, songs: setList.songs.filter(id => id !== songId) };
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
          body: JSON.stringify({ name: updatedSetList.name, songs: updatedSetList.songs })
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
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>🎸 RoNz Chord Pro</h1>
          <p>Professional Chord & Lyrics App</p>
        </div>
      </header>
      
      <div className="container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h3>{currentSetListName}</h3>
              <div className="header-actions">
              <button onClick={() => setShowSongForm(true)} className="btn-icon" title="Tambah Lagu">
                ➕
              </button>
              <button onClick={() => setShowSetListManager(true)} className="btn-icon" title="Set List">
                ⚙️
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              <select
                className="setlist-select"
                value={currentSetList || ''}
                onChange={(e) => setCurrentSetList(e.target.value || null)}
              >
                <option value="">Semua Lagu</option>
                {setLists.map(sl => (
                  <option key={sl.id} value={sl.id}>{sl.name} ({sl.songs?.length || 0})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="sidebar-search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul, artis, atau lirik..."
            />
          </div>
          <div style={{ padding: '0 0.5rem 0.5rem' }}>
            <select
              className="setlist-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="title-asc">📋 Judul A-Z</option>
              <option value="title-desc">📋 Judul Z-A</option>
              <option value="artist-asc">🎤 Artis A-Z</option>
              <option value="newest">🕒 Terbaru</option>
            </select>
          </div>
          
          {setLists.length > 0 && (
            <div className="setlist-checkbox-panel">
              <div className="setlist-checkbox-header">Tambah ke:</div>
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
            </div>
          )}
          
          <div className="song-list">
            {displaySongs.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                {songs.length === 0 ? 'Tidak ada lagu. Klik ➕ untuk tambah.' : 'Tidak ada hasil pencarian.'}
              </div>
            ) : (
              displaySongs.map(song => (
              <div 
                key={song.id}
                className={`song-item ${selectedSong?.id === song.id ? 'active' : ''}`}
              >
                <div className="song-info" onClick={() => handleSelectSong(song)}>
                  <div className="song-title">{song.title}</div>
                  <div className="song-artist">{song.artist}</div>
                </div>
                <div className="song-actions">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSong(song);
                    }} 
                    className="btn-icon-sm"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSong(song.id);
                    }} 
                    className="btn-icon-sm btn-danger"
                    title="Hapus"
                  >
                    🗑️
                  </button>
                  {selectedSetListsForAdd.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectedSetListsForAdd.forEach(slId => {
                          handleAddSongToSetList(slId, song.id);
                        });
                      }}
                      className="btn-icon-sm btn-success"
                      title="Tambah ke Setlist Terpilih"
                    >
                      ➕
                    </button>
                  )}
                </div>
              </div>
            ))
            )}
          </div>
          
          <div className="sidebar-footer">
              <div className="db-actions">
              <button onClick={handleExportDatabase} className="btn btn-sm btn-block">
                📥 Export
              </button>
              <label className="btn btn-sm btn-block">
                📤 Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportDatabase}
                  style={{ display: 'none' }}
                />
              </label>
              <button 
                onClick={handleSyncToDatabase} 
                className="btn btn-sm btn-block btn-primary"
                disabled={syncingToDb}
              >
                {syncingToDb ? '⏳ Syncing...' : '☁️ Sync ke DB'}
              </button>
            </div>
            
            <div className="db-info">
              <small>
                {songs.length} lagu • {setLists.length} set list
              </small>
            </div>
          </div>
        </aside>
        
        <main className="main">
            <>
              <div className="controls">
            <div className="control-group">
              <label>Transpose:</label>
              <button onClick={() => handleTranspose(-1)} className="btn btn-sm">♭ -1</button>
              <span className="transpose-value">
                {transpose > 0 ? `+${transpose}` : transpose}
              </span>
              <button onClick={() => handleTranspose(1)} className="btn btn-sm">♯ +1</button>
              <button onClick={() => setTranspose(0)} className="btn btn-sm">Reset</button>
            </div>
            
            <div className="control-group">
              <button 
                onClick={() => setAutoScrollActive(!autoScrollActive)}
                className={`btn ${autoScrollActive ? 'btn-primary' : ''}`}
              >
                {autoScrollActive ? '⏸ Stop Scroll' : '▶ Auto Scroll'}
              </button>
              
              {autoScrollActive && (
                <div className="speed-controls">
                  <button onClick={() => setScrollSpeed(Math.max(0.5, scrollSpeed - 0.5))} className="btn btn-sm">
                    −
                  </button>
                  <span className="speed-value">{scrollSpeed.toFixed(1)}x</span>
                  <button onClick={() => setScrollSpeed(Math.min(5, scrollSpeed + 0.5))} className="btn btn-sm">
                    +
                  </button>
                </div>
              )}
            </div>
            
            <div className="control-group">
              <button 
                onClick={() => setShowYouTube(!showYouTube)}
                className={`btn ${showYouTube ? 'btn-primary' : ''}`}
              >
                {showYouTube ? '📺 Sembunyikan YouTube' : '📺 Tampilkan YouTube'}
              </button>
            </div>
          </div>
          
          {showYouTube && selectedSong?.youtubeId && (
            <div className="youtube-section">
              <YouTubeViewer videoId={selectedSong.youtubeId} />
            </div>
          )}
          
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
      
      {showSetListManager && (
        <SetListManager
          setLists={setLists}
          songs={songs}
          onCreateSetList={handleCreateSetList}
          onDeleteSetList={handleDeleteSetList}
          onAddSongToSetList={handleAddSongToSetList}
          onRemoveSongFromSetList={handleRemoveSongFromSetList}
          onSelectSetList={(id) => {
            setCurrentSetList(id);
            setShowSetListManager(false);
          }}
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
      <footer className="app-footer">
        <span>Versi aplikasi: {import.meta.env.VITE_APP_VERSION}</span>
      </footer>
    </div>
  );
}

export default App;
