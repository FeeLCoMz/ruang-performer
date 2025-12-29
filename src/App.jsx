import React, { useState, useRef, useEffect } from 'react';
import ChordDisplay from './components/ChordDisplay';
import YouTubeViewer from './components/YouTubeViewer';
import AutoScroll from './components/AutoScroll';
import SongForm from './components/SongForm';
import SetListManager from './components/SetListManager';
import { useLocalStorage } from './hooks/useLocalStorage';
import { initialSongs, initialSetLists } from './data/songs';
import './App.css';

function App() {
  const [songs, setSongs] = useLocalStorage('ronz-songs', initialSongs);
  const [setLists, setSetLists] = useLocalStorage('ronz-setlists', initialSetLists);
  const [selectedSong, setSelectedSong] = useState(songs[0]);
  const [transpose, setTranspose] = useState(0);
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [showYouTube, setShowYouTube] = useState(false);
  const [currentSetList, setCurrentSetList] = useState(null);
  const [showSongForm, setShowSongForm] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [showSetListManager, setShowSetListManager] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const scrollRef = useRef(null);
  
  // Fetch songs and setlists from Turso on mount (if enabled)
  useEffect(() => {
    if (import.meta.env.VITE_TURSO_SYNC === 'true') {
      Promise.all([
        fetch('/api/songs').then(res => res.json()),
        fetch('/api/setlists').then(res => res.json())
      ])
        .then(([songsData, setlistsData]) => {
          if (Array.isArray(songsData) && songsData.length > 0) {
            const remoteSongs = songsData.map(row => ({
              id: row.id,
              title: row.title || '',
              artist: row.artist || '',
              youtubeId: row.youtubeId || '',
              melody: row.melody || '',
              lyrics: row.lyrics || '',
              createdAt: row.createdAt || new Date().toISOString()
            }));
            setSongs(remoteSongs);
            setSelectedSong(remoteSongs[0]);
          }

          if (Array.isArray(setlistsData) && setlistsData.length > 0) {
            setSetLists(setlistsData);
          }
        })
        .catch(err => console.warn('Failed to fetch from Turso:', err));
    }
  }, []);
  
  // Transpose handlers
  const handleTranspose = (value) => {
    setTranspose(prev => {
      const newValue = prev + value;
      if (newValue > 11) return newValue - 12;
      if (newValue < -11) return newValue + 12;
      return newValue;
    });
  };
  
  // Song handlers
  const handleSelectSong = (song) => {
    setSelectedSong(song);
    setTranspose(0);
    setAutoScrollActive(false);
  };
  
  const handleSaveSong = (songData) => {
    if (editingSong) {
      // Update existing song
      setSongs(prev => prev.map(song => 
        song.id === editingSong.id ? { ...songData, id: editingSong.id } : song
      ));
      setSelectedSong({ ...songData, id: editingSong.id });
      // Sync update to Turso (optional)
      if (import.meta.env.VITE_TURSO_SYNC === 'true') {
        fetch(`/api/songs/${editingSong.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...songData, id: editingSong.id })
        }).catch(() => {});
      }
      setEditingSong(null);
    } else {
      // Add new song
      const newSong = { ...songData, id: Date.now() };
      setSongs(prev => [...prev, newSong]);
      setSelectedSong(newSong);
      // Sync create to Turso (optional)
      if (import.meta.env.VITE_TURSO_SYNC === 'true') {
        fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSong)
        }).catch(() => {});
      }
    }
    setShowSongForm(false);
    setTranspose(0);
  };

  const handleEditSong = (song) => {
    setEditingSong(song);
    setShowSongForm(true);
  };

  const handleDeleteSong = (songId) => {
    if (!confirm('Hapus lagu ini?')) return;
    
    setSongs(prev => prev.filter(song => song.id !== songId));
    // Sync delete to Turso (optional)
    if (import.meta.env.VITE_TURSO_SYNC === 'true') {
      fetch(`/api/songs/${songId}`, { method: 'DELETE' }).catch(() => {});
    }
    
    // Remove from all setlists
    setSetLists(prev => prev.map(sl => ({
      ...sl,
      songs: sl.songs.filter(id => id !== songId)
    })));
    
    // Update selected song if deleted
    if (selectedSong?.id === songId) {
      const remainingSongs = songs.filter(song => song.id !== songId);
      setSelectedSong(remainingSongs[0] || null);
    }
  };

  // SetList handlers
  const handleCreateSetList = (name) => {
    const newSetList = {
      id: Date.now(),
      name,
      songs: [],
      createdAt: new Date().toISOString()
    };
    setSetLists(prev => [...prev, newSetList]);
    // Sync create to Turso (optional)
    if (import.meta.env.VITE_TURSO_SYNC === 'true') {
      fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSetList)
      }).catch(() => {});
    }
  };
  
  const handleDeleteSetList = (id) => {
    setSetLists(prev => prev.filter(sl => sl.id !== id));
    if (currentSetList === id) {
      setCurrentSetList(null);
    }
    // Sync delete to Turso (optional)
    if (import.meta.env.VITE_TURSO_SYNC === 'true') {
      fetch(`/api/setlists/${id}`, { method: 'DELETE' }).catch(() => {});
    }
  };
  
  const handleAddSongToSetList = (setListId, songId) => {
    setSetLists(prev => prev.map(sl => {
      if (sl.id === setListId && !sl.songs.includes(songId)) {
        return { ...sl, songs: [...sl.songs, songId] };
      }
      return sl;
    }));
    // Sync update to Turso (optional)
    if (import.meta.env.VITE_TURSO_SYNC === 'true') {
      const setList = setLists.find(sl => sl.id === setListId);
      if (setList) {
        fetch(`/api/setlists/${setListId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...setList, songs: [...setList.songs, songId] })
        }).catch(() => {});
      }
    }
  };
  
  const handleRemoveSongFromSetList = (setListId, songId) => {
    setSetLists(prev => prev.map(sl => {
      if (sl.id === setListId) {
        return { ...sl, songs: sl.songs.filter(id => id !== songId) };
      }
      return sl;
    }));
    // Sync update to Turso (optional)
    if (import.meta.env.VITE_TURSO_SYNC === 'true') {
      const setList = setLists.find(sl => sl.id === setListId);
      if (setList) {
        fetch(`/api/setlists/${setListId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...setList, songs: setList.songs.filter(id => id !== songId) })
        }).catch(() => {});
      }
    }
  };
  
  // Import/Export
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
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(s =>
      s.title?.toLowerCase().includes(q) ||
      s.artist?.toLowerCase().includes(q) ||
      s.lyrics?.toLowerCase().includes(q)
    );
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
          </div>
          <div className="sidebar-search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul, artis, atau lirik..."
            />
          </div>
          
          <div className="song-list">
            {displaySongs.map(song => (
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
                </div>
              </div>
            ))}
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
            </div>
            <div className="db-info">
              <small>{songs.length} lagu • {setLists.length} set list</small>
            </div>
          </div>
        </aside>
        
        <main className="main">
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
              <label>
                <input
                  type="checkbox"
                  checked={showYouTube}
                  onChange={(e) => setShowYouTube(e.target.checked)}
                />
                YouTube
              </label>
            </div>
          </div>
          
          {showYouTube && selectedSong?.youtubeId && (
            <div className="youtube-section">
              <YouTubeViewer videoId={selectedSong.youtubeId} />
            </div>
          )}
          
          <div className="lyrics-section" ref={scrollRef}>
            <ChordDisplay song={selectedSong} transpose={transpose} />
          </div>
          
          <AutoScroll
            isActive={autoScrollActive}
            speed={scrollSpeed}
            scrollRef={scrollRef}
          />
        </main>
      </div>
      
      {showSongForm && (
        <SongForm
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
    </div>
  );
}

export default App;
