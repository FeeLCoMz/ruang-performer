import React, { useState, useRef, useEffect } from 'react';
import ChordDisplay from './components/ChordDisplay';
import { getTransposeSteps } from './utils/chordUtils';
import YouTubeViewer from './components/YouTubeViewer';
import AutoScroll from './components/AutoScroll';
import HelpModal from './components/HelpModal';
import SongFormBaru from './components/SongForm';
import SetListForm from './components/SetListForm';
import SongListItem from './components/SongListItem';
import SettingsModal from './components/SettingsModal';
import './App.css';

function sanitizeSongs(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(Boolean)
    .filter(item => item.title?.trim() && item.artist?.trim() && item.lyrics?.trim())
    .map(item => {
      // Remove deprecated melody field
      const { melody, ...rest } = item;
      return {
        ...rest,
        title: item.title.trim(),
        artist: item.artist.trim(),
        lyrics: item.lyrics.trim(),
        key: item.key || '',
        tempo: item.tempo || '',
        style: item.style || '',
        timestamps: Array.isArray(item.timestamps) ? item.timestamps : []
      };
    });
}

function sanitizeSetLists(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(Boolean)
    .filter(sl => {
      const name = sl.name?.trim();
      if (!name) return false;
      return !name.toLowerCase().includes('untitled');
    })
    .map(sl => ({
      ...sl,
      name: sl.name.trim(),
      songs: Array.isArray(sl.songs) ? sl.songs.filter(Boolean) : [],
      songKeys: typeof sl.songKeys === 'object' && sl.songKeys !== null ? sl.songKeys : {},
      completedSongs: typeof sl.completedSongs === 'object' && sl.completedSongs !== null ? sl.completedSongs : {}
    }));
}

// Generate unique ID dengan timestamp + random
const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

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
    // Return empty array - no sample songs
    return [];
  };
  const getInitialSetLists = () => {
    try {
      const data = localStorage.getItem('ronz_setlists');
      if (data) {
        const parsed = sanitizeSetLists(JSON.parse(data));
        if (parsed.length > 0) return parsed;
      }
    } catch { }
    // Return empty array - no sample setlists
    return [];
  };
  const [songs, setSongs] = useState(getInitialSongs);
  const [setLists, setSetLists] = useState(getInitialSetLists);
  const [selectedSong, setSelectedSong] = useState(null);
  const [transpose, setTranspose] = useState(0);
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [showYouTube, setShowYouTube] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [viewerSeekTo, setViewerSeekTo] = useState(null);
  const [currentSetList, setCurrentSetList] = useState(null);
  const [showSongForm, setShowSongForm] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [showSetListForm, setShowSetListForm] = useState(false);
  const [editingSetList, setEditingSetList] = useState(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingToDb, setSyncingToDb] = useState(false);
  const [runtimeErrors, setRuntimeErrors] = useState([]);
  const [sortBy, setSortBy] = useState('title-asc');
  const [selectedSetListsForAdd, setSelectedSetListsForAdd] = useState([]);
  const [showSetListPopup, setShowSetListPopup] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('ronz_view_mode') || 'default';
    } catch {
      return 'default';
    }
  });
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('ronz_dark_mode');
      if (saved !== null) return saved === 'true';
      // Auto-detect system preference
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });
  const [showHelp, setShowHelp] = useState(false);
  const scrollRef = useRef(null);
  const isInitialLoad = useRef(true);

  // Normalize mixed timestamp formats (number ms vs ISO string) to millis
  const toTimestamp = (v) => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
  };

  // Pastikan state setlist selalu bersih (tanpa untitled) setelah mount
  useEffect(() => {
    setSetLists(prev => sanitizeSetLists(prev));
  }, []);

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
                  const remoteTs = toTimestamp(remote.updatedAt);
                  const localTs = toTimestamp(merged[localIdx].updatedAt);
                  merged[localIdx] = (remoteTs > localTs) ? remote : merged[localIdx];
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
                  const remoteTs = toTimestamp(remote.updatedAt);
                  const localTs = toTimestamp(merged[localIdx].updatedAt);
                  merged[localIdx] = (remoteTs > localTs) ? remote : merged[localIdx];
                } else {
                  merged.push(remote);
                }
              });
              return merged;
            });
          }
        })
        .finally(() => {
          // Allow subsequent changes to sync after initial remote merge
          isInitialLoad.current = false;
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
    // Hindari overwrite awal dengan data lokal yang stale sebelum merge remote
    if (!isInitialLoad.current && navigator.onLine && songs.length > 0) {
      fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(songs)
      }).catch(() => { });
    }
  }, [songs]);
  useEffect(() => {
    try {
      const sanitized = sanitizeSetLists(setLists);
      localStorage.setItem('ronz_setlists', JSON.stringify(sanitized));
    } catch { }
  }, [setLists]);

  // Save dark mode preference
  useEffect(() => {
    try {
      localStorage.setItem('ronz_dark_mode', darkMode.toString());
      document.documentElement.classList.toggle('dark-mode', darkMode);
    } catch { }
  }, [darkMode]);

  // Sync setLists to backend (debounced to avoid too many requests)
  useEffect(() => {
    if (!navigator.onLine || setLists.length === 0) return;

    const syncTimeout = setTimeout(async () => {
      for (const setList of setLists) {
        try {
          // Check if setlist exists in backend
          const checkRes = await fetch(`/api/setlists/${setList.id}`);
          if (checkRes.ok) {
            // Update existing
            await fetch(`/api/setlists/${setList.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(setList)
            });
          } else if (checkRes.status === 404) {
            // Create new
            await fetch('/api/setlists', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(setList)
            });
          }
        } catch (err) {
          console.error(`Failed to sync setlist ${setList.id}:`, err);
        }
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(syncTimeout);
  }, [setLists]);

  // Collect runtime errors without killing the UI
  useEffect(() => {
    const handleError = (event) => {
      const message = event?.message || event?.reason?.message || 'Unknown error';
      const detail = event?.error?.stack || event?.reason?.stack || '';
      setRuntimeErrors(prev => {
        const next = [{ id: generateUniqueId(), message, detail }, ...prev];
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
    // Apply setlist-specific key override as transpose if exists
    if (currentSetList) {
      const setList = setLists.find(sl => sl.id === currentSetList);
      const overrideKey = setList?.songKeys?.[song.id];
      if (overrideKey && (song.key || (song.lyrics && song.lyrics.includes('{key')))) {
        // Determine original key: prefer song.key; else parsed metadata handled in ChordDisplay
        const originalKey = song.key;
        const steps = originalKey ? getTransposeSteps(originalKey, overrideKey) : 0;
        setTranspose(steps);
      } else {
        setTranspose(0);
      }
    } else {
      setTranspose(0);
    }
  };

  const handleSaveSong = async (songData) => {
    const isEditMode = !!editingSong;
    const songId = isEditMode ? editingSong.id : generateUniqueId();
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
    
    // Sync to database
    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const endpoint = isEditMode ? `/api/songs/${songId}` : '/api/songs';
      await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSong)
      });
    } catch (err) {
      console.error('Gagal menyimpan lagu ke database:', err);
    }
    
    setSelectedSong(updatedSong);
    setTranspose(0);
    setAutoScrollActive(false);
    setShowSongForm(false);
    setEditingSong(null);
  };

  const handleCreateSetList = async (name) => {
    const now = Date.now();
    const newSetList = {
      id: generateUniqueId(),
      name,
      songs: [],
      songKeys: {},
      completedSongs: {},
      createdAt: new Date().toISOString(),
      updatedAt: now
    };
    setSetLists(prevSetLists => [...prevSetLists, newSetList]);
    setCurrentSetList(newSetList.id);
    
    // Sync to database
    try {
      await fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSetList)
      });
    } catch (err) {
      console.error('Gagal membuat setlist di database:', err);
    }
    
    setShowSetListForm(false);
    setEditingSetList(null);
  };

  const handleUpdateSetList = async (id, name) => {
    let updatedSetList = null;
    setSetLists(prevSetLists => {
      return prevSetLists.map(sl => {
        if (sl.id === id) {
          const next = { ...sl, name, updatedAt: Date.now() };
          updatedSetList = next;
          return next;
        }
        return sl;
      });
    });
    if (updatedSetList) {
      try {
        await fetch(`/api/setlists/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, songs: updatedSetList.songs, songKeys: updatedSetList.songKeys, updatedAt: updatedSetList.updatedAt })
        });
      } catch (err) {
        console.error('Gagal update setlist:', err);
      }
    }
    setShowSetListForm(false);
    setEditingSetList(null);
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

  const handleDuplicateSetList = async (id) => {
    const originalSetList = setLists.find(sl => sl.id === id);
    if (!originalSetList) return;

    const now = Date.now();
    const duplicatedSetList = {
      id: generateUniqueId(),
      name: `${originalSetList.name} (Copy)`,
      songs: [...originalSetList.songs],
      songKeys: { ...(originalSetList.songKeys || {}) },
      completedSongs: {},
      createdAt: new Date().toISOString(),
      updatedAt: now
    };

    setSetLists(prevSetLists => [...prevSetLists, duplicatedSetList]);

    // Sync to database
    try {
      await fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedSetList)
      });
    } catch (err) {
      console.error('Gagal menduplikat setlist di database:', err);
    }
  };

  const handleAddSongToSetList = async (setListId, songId) => {
    let updatedSetList = null;
    setSetLists(prevSetLists => {
      return prevSetLists.map(setList => {
        if (setList.id === setListId && !setList.songs.includes(songId)) {
          const next = { ...setList, songs: [...setList.songs, songId], songKeys: setList.songKeys || {}, updatedAt: Date.now() };
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
          body: JSON.stringify({ name: updatedSetList.name, songs: updatedSetList.songs, songKeys: updatedSetList.songKeys, completedSongs: updatedSetList.completedSongs, updatedAt: updatedSetList.updatedAt })
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
          const next = { 
            ...setList, 
            songs: setList.songs.filter(id => id !== songId), 
            songKeys: setList.songKeys || {}, 
            completedSongs: setList.completedSongs || {},
            updatedAt: Date.now() 
          };
          // Clean up songKeys
          if (next.songKeys && next.songKeys[songId]) {
            const { [songId]: _, ...rest } = next.songKeys;
            next.songKeys = rest;
          }
          // Clean up completedSongs
          if (next.completedSongs && next.completedSongs[songId]) {
            const { [songId]: _, ...rest } = next.completedSongs;
            next.completedSongs = rest;
          }
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
          body: JSON.stringify({ name: updatedSetList.name, songs: updatedSetList.songs, songKeys: updatedSetList.songKeys, completedSongs: updatedSetList.completedSongs, updatedAt: updatedSetList.updatedAt })
        });
      } catch (err) {
        console.error('Gagal menghapus lagu dari setlist:', err);
      }
    }
  };

  // Update/setlist-specific key override for a song
  const handleSetListSongKey = async (setListId, songId, key) => {
    let updatedSetList = null;
    setSetLists(prevSetLists => {
      return prevSetLists.map(setList => {
        if (setList.id === setListId) {
          const next = { ...setList, songKeys: { ...(setList.songKeys || {}) }, updatedAt: Date.now() };
          if (key && key.trim()) {
            next.songKeys[songId] = key.trim();
          } else if (next.songKeys[songId]) {
            const { [songId]: _, ...rest } = next.songKeys;
            next.songKeys = rest;
          }
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
          body: JSON.stringify({ name: updatedSetList.name, songs: updatedSetList.songs, songKeys: updatedSetList.songKeys, completedSongs: updatedSetList.completedSongs, updatedAt: updatedSetList.updatedAt })
        });
      } catch (err) {
        console.error('Gagal update key lagu di setlist:', err);
      }
    }
  };

  // Toggle completed status untuk lagu dalam setlist
  const handleToggleCompletedSong = async (setListId, songId) => {
    let updatedSetList = null;
    setSetLists(prevSetLists => {
      return prevSetLists.map(setList => {
        if (setList.id === setListId) {
          const next = { ...setList, completedSongs: { ...(setList.completedSongs || {}) }, updatedAt: Date.now() };
          if (next.completedSongs[songId]) {
            delete next.completedSongs[songId];
          } else {
            next.completedSongs[songId] = Date.now();
          }
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
          body: JSON.stringify({ name: updatedSetList.name, songs: updatedSetList.songs, songKeys: updatedSetList.songKeys, completedSongs: updatedSetList.completedSongs, updatedAt: updatedSetList.updatedAt })
        });
      } catch (err) {
        console.error('Gagal update status completed lagu:', err);
      }
    }
  };

  const handleDeleteSong = async (songId) => {
    if (!confirm('Hapus lagu ini?')) return;
    setSongs(prevSongs => prevSongs.filter(s => s.id !== songId));
    if (selectedSong?.id === songId) {
      setSelectedSong(null);
    }
    
    // Sync to database
    try {
      await fetch(`/api/songs/${songId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Gagal menghapus lagu dari database:', err);
    }
  };

  const handleEditSong = (song) => {
    setEditingSong(song);
    setShowSongForm(true);
  };

  const handleToggleViewMode = () => {
    const modes = ['default', 'compact', 'detailed'];
    const currentIndex = modes.indexOf(viewMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setViewMode(nextMode);
    try {
      localStorage.setItem('ronz_view_mode', nextMode);
    } catch (e) {
      console.error('Failed to save view mode:', e);
    }
  };

  const handleSyncToDatabase = async () => {
    if (songs.length === 0 && setLists.length === 0) {
      alert('Tidak ada lagu atau setlist untuk disinkronkan.');
      return;
    }

    setSyncingToDb(true);
    try {
      // Sync songs
      let songResult = { inserted: 0, updated: 0 };
      if (songs.length > 0) {
        const songResponse = await fetch('/api/songs/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songs })
        });

        songResult = await songResponse.json();
        if (!songResponse.ok) {
          throw new Error(songResult?.error || 'Sync lagu gagal');
        }
      }

      // Sync setlists (filter out untitled)
      let setlistResult = { inserted: 0, updated: 0, skipped: 0 };
      const validSetLists = setLists.filter(sl => 
        sl.name && 
        sl.name.trim() !== '' && 
        !sl.name.toLowerCase().includes('untitled')
      );
      
      if (validSetLists.length > 0) {
        const setlistResponse = await fetch('/api/setlists/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setlists: validSetLists })
        });

        setlistResult = await setlistResponse.json();
        if (!setlistResponse.ok) {
          throw new Error(setlistResult?.error || 'Sync setlist gagal');
        }
      }

      const messages = [];
      if (songs.length > 0) {
        messages.push(`Lagu: ${songResult.inserted || 0} disisipkan, ${songResult.updated || 0} diperbarui`);
      }
      if (validSetLists.length > 0) {
        messages.push(`Setlist: ${setlistResult.inserted || 0} disisipkan, ${setlistResult.updated || 0} diperbarui`);
      }
      if (setlistResult.skipped > 0) {
        messages.push(`${setlistResult.skipped} setlist dilewati (untitled)`);
      }

      alert(`Sync selesai.\n${messages.join('\n')}`);
    } catch (error) {
      console.error('Sync error:', error);
      alert('Gagal sync ke database. Cek console untuk detail.');
    } finally {
      setSyncingToDb(false);
    }
  };

  const handleExportDatabase = () => {
    const data = {
      version: '3.0',
      exportDate: new Date().toISOString(),
      songs: songs.map(song => {
        // Ensure all new fields are included and melody is removed
        const { melody, ...rest } = song;
        return {
          ...rest,
          key: song.key || '',
          tempo: song.tempo || '',
          style: song.style || '',
          timestamps: Array.isArray(song.timestamps) ? song.timestamps : []
        };
      }),
      setLists: setLists.map(sl => ({
        ...sl,
        songKeys: sl.songKeys || {}
      }))
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

        // Migrate and sanitize songs (remove melody, ensure new fields)
        const migratedSongs = sanitizeSongs(data.songs);
        
        // Migrate and sanitize setlists (ensure songKeys exists)
        const migratedSetLists = data.setLists ? sanitizeSetLists(data.setLists) : [];

        const version = data.version || '1.0';
        const message = `Import ${migratedSongs.length} lagu dan ${migratedSetLists.length} set list?\n\nVersi: ${version}\nSemua data akan digantikan.`;
        
        if (confirm(message)) {
          setSongs(migratedSongs);
          setSetLists(migratedSetLists);
          if (migratedSongs.length > 0) setSelectedSong(migratedSongs[0]);
          setCurrentSetList(null);
          setTranspose(0);
          alert(`Import berhasil!\n\nLagu: ${migratedSongs.length}\nSet list: ${migratedSetLists.length}`);
        }
      } catch (error) {
        console.error('Import error:', error);
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
              📋 Lagu
            </button>
            <button
              className={`nav-btn ${activeNav === 'setlists' ? 'active' : ''}`}
              onClick={() => setActiveNav('setlists')}
            >
              🎵 Setlist
            </button>
            {selectedSong && (
              <button
                className="nav-btn active"
                onClick={() => setSelectedSong(null)}
                title="Kembali ke daftar"
              >
                ← Kembali
              </button>
            )}
            <button
              className="nav-btn"
              onClick={() => setShowSettingsMenu(true)}
              style={{ marginLeft: 'auto' }}
              title="Pengaturan"
            >
              ⚙️
            </button>
            <button
              className="nav-btn"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              className="nav-btn"
              onClick={() => setShowHelp(true)}
              title="Bantuan & Panduan"
            >
              ❓ Bantuan
            </button>
          </nav>

          <div className="content-wrapper">
            {/* Main Content Area */}
            {!selectedSong ? (
              // Songs or Setlists View
              <>
                {activeNav === 'songs' && (
                  <div className="main-content songs-view">
                    <div className="view-header">
                      <div>
                        <h2>📋 Lagu</h2>
                        {currentSetList && (
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Setlist: {setLists.find(sl => sl.id === currentSetList)?.name}
                            <button 
                              onClick={() => setCurrentSetList(null)}
                              style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              ✕ Lihat Semua
                            </button>
                          </p>
                        )}
                      </div>
                      <button onClick={() => setShowSongForm(true)} className="btn btn-sm btn-primary" title="Tambah Lagu">
                        ➕
                      </button>
                    </div>
                    
                    <div className="filters-bar">
                      <div className="search-box" style={{ flex: 1 }}>
                        <span className="search-icon">🔍</span>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari lagu..."
                          aria-label="Cari lagu"
                        />
                      </div>
                      <select
                        className="setlist-select"
                        value={currentSetList || ''}
                        onChange={(e) => setCurrentSetList(e.target.value || null)}
                        title="Pilih setlist untuk filter lagu"
                      >
                        <option value="">📋 Semua Lagu</option>
                        {setLists.map(setList => (
                          <option key={setList.id} value={setList.id}>
                            🎵 {setList.name} ({setList.songs?.length || 0})
                          </option>
                        ))}
                      </select>
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
                      <button
                        className="btn btn-icon"
                        onClick={handleToggleViewMode}
                        title={`Gaya tampilan: ${viewMode === 'default' ? 'Default' : viewMode === 'compact' ? 'Compact' : 'Detailed'}`}
                      >
                        {viewMode === 'compact' ? '📇' : viewMode === 'detailed' ? '📋' : '🎴'}
                      </button>
                    </div>

                    <div className={`songs-cards-grid view-mode-${viewMode}`}>
                      {displaySongs.length === 0 ? (
                        <div className="empty-state">
                          {songs.length === 0 ? 'Tidak ada lagu. Klik ➕ untuk tambah.' : 'Tidak ada hasil pencarian.'}
                        </div>
                      ) : (
                        displaySongs.map(song => (
                          <SongListItem
                            key={song.id}
                            song={song}
                            isActive={selectedSong?.id === song.id}
                            viewMode={viewMode}
                            onSelect={() => handleSelectSong(song)}
                            onEdit={() => handleEditSong(song)}
                            onDelete={() => handleDeleteSong(song.id)}
                            setLists={setLists}
                            currentSetList={currentSetList}
                            isCompleted={currentSetList ? (setLists.find(sl => sl.id === currentSetList)?.completedSongs?.[song.id]) : false}
                            onToggleCompleted={currentSetList ? () => handleToggleCompletedSong(currentSetList, song.id) : null}
                            overrideKey={(currentSetList ? (setLists.find(sl => sl.id === currentSetList)?.songKeys?.[song.id]) : null) || null}
                            onSetListKeyChange={(key) => {
                              if (!currentSetList) return;
                              const setListId = currentSetList;
                              let updatedSetList = null;
                              setSetLists(prevSetLists => {
                                return prevSetLists.map(setList => {
                                  if (setList.id === setListId) {
                                    const next = { ...setList, songKeys: { ...(setList.songKeys || {}) }, updatedAt: Date.now() };
                                    if (key && key.trim()) {
                                      next.songKeys[song.id] = key.trim();
                                    } else if (next.songKeys[song.id]) {
                                      const { [song.id]: _, ...rest } = next.songKeys;
                                      next.songKeys = rest;
                                    }
                                    updatedSetList = next;
                                    return next;
                                  }
                                  return setList;
                                });
                              });
                              if (updatedSetList) {
                                fetch(`/api/setlists/${setListId}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name: updatedSetList.name, songs: updatedSetList.songs, songKeys: updatedSetList.songKeys, updatedAt: updatedSetList.updatedAt })
                                }).catch(err => console.error('Gagal menyimpan key setlist:', err));
                              }
                            }}
                            onAddToSetLists={slIds => slIds.forEach(slId => handleAddSongToSetList(slId, song.id))}
                            onRemoveFromSetList={handleRemoveSongFromSetList}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeNav === 'setlists' && (
                  <div className="main-content setlists-view">
                    <div className="view-header">
                      <h2>🎵 Setlist</h2>
                      <button onClick={() => { setEditingSetList(null); setShowSetListForm(true); }} className="btn btn-sm btn-primary">
                        ➕ Buat Setlist
                      </button>
                    </div>

                    <div className="setlists-cards-grid">
                      {setLists.length === 0 ? (
                        <div className="empty-state">
                          Tidak ada setlist. Klik ➕ untuk membuat.
                        </div>
                      ) : (
                        setLists.map(setList => (
                          <div
                            key={setList.id}
                            className={`setlist-card ${currentSetList === setList.id ? 'active' : ''}`}
                            onClick={() => {
                              setCurrentSetList(setList.id);
                              setActiveNav('songs');
                            }}
                          >
                            <div className="setlist-card-header">
                              <h3>📋 {setList.name}</h3>
                              <div className="setlist-card-actions">
                                <button
                                  className="btn btn-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSetList(setList);
                                    setShowSetListForm(true);
                                  }}
                                  title="Edit Setlist"
                                >
                                  ✎
                                </button>
                                <button
                                  className="btn btn-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateSetList(setList.id);
                                  }}
                                  title="Duplikat Setlist"
                                >
                                  📋
                                </button>
                                <button
                                  className="btn btn-xs btn-danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSetList(setList.id);
                                  }}
                                  title="Hapus Setlist"
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                            <div className="setlist-card-body">
                              <p className="song-count">
                                {setList.songs?.length || 0} lagu
                                {setList.songs?.length > 0 && (
                                  <>
                                    {' • '}
                                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                                      ✓ {Object.keys(setList.completedSongs || {}).length}
                                    </span>
                                    {' selesai'}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Song Detail View
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
                      <span className="divider" />
                      {/* Print Button */}
                      <button
                        onClick={() => window.print()}
                        className="btn btn-xs"
                        title="Cetak/Print (PDF)"
                      >
                        🖨️
                      </button>
                    </div>
                  )}
                  {showYouTube && selectedSong?.youtubeId && (
                    <div className="youtube-section">
                      <YouTubeViewer
                        videoId={selectedSong.youtubeId}
                        onTimeUpdate={(t, d) => { setCurrentVideoTime(t); setVideoDuration(d); }}
                        seekToTime={viewerSeekTo}
                      />
                    </div>
                  )}
                  {/* Tombol fullscreen dan lirik fullscreen */}
                  <div className="lyrics-section" ref={scrollRef}>
                    {selectedSong ? (
                      <>
                        {(Array.isArray(selectedSong.timestamps) && selectedSong.timestamps.length > 0) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
                            <strong style={{ color: 'var(--text)' }}>⏱️ Struktur Lagu</strong>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {selectedSong.timestamps.map((ts, idx) => (
                                <button
                                  key={idx}
                                  className="btn btn-xs"
                                  title={`Loncat ke ${ts.label}: ${Math.floor(ts.time/60)}:${(ts.time%60).toString().padStart(2,'0')}`}
                                  onClick={() => {
                                    if (selectedSong?.youtubeId) {
                                      setShowYouTube(true);
                                      setViewerSeekTo(Math.max(0, Number(ts.time) || 0));
                                      setTimeout(() => setViewerSeekTo(null), 0);
                                    }
                                  }}
                                >
                                  {ts.label} ({Math.floor(ts.time/60)}:{(ts.time%60).toString().padStart(2,'0')})
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleEditSong(selectedSong)}
                            className="btn btn-sm btn-primary"
                            title="Edit lagu ini"
                          >
                            ✏️ Edit Lagu
                          </button>
                        </div>
                        <ChordDisplay song={selectedSong} transpose={transpose} />
                      </>
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
            )}
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

        {showSetListForm && (
          <SetListForm
            setList={editingSetList}
            onSave={(name) => {
              if (editingSetList) {
                handleUpdateSetList(editingSetList.id, name);
              } else {
                handleCreateSetList(name);
              }
            }}
            onCancel={() => {
              setShowSetListForm(false);
              setEditingSetList(null);
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
