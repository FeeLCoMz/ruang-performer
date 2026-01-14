import React, { useState, useRef, useEffect } from 'react';
import ChordDisplay from './components/ChordDisplay';
import YouTubeViewer from './components/YouTubeViewer';
import AutoScroll from './components/AutoScroll';
import HelpModal from './components/HelpModal';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import SongFormBaru from './components/SongForm';
import SetListForm from './components/SetListForm';
import SongListItem from './components/SongListItem';
import SettingsModal from './components/SettingsModal';
import ToastContainer from './components/ToastContainer';
import { 
  useKeyboardShortcuts, 
  useToast, 
  useSongs, 
  useSetLists, 
  usePerformanceMode,
  useDatabase,
  useServiceWorker
} from './hooks';
import './App.css';

// Helper functions for data sanitization
const sanitizeSongs = (songs) => {
  return (Array.isArray(songs) ? songs : []).map(song => {
    const { melody, ...rest } = song;
    return rest;
  });
};

const sanitizeSetLists = (setlists) => {
  return (Array.isArray(setlists) ? setlists : []);
};

const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

function App() {
  // Toast notifications
  const { toasts, closeToast, success, error, warning } = useToast();

  // UI state
  const [showSidebar, setShowSidebar] = useState(true);
  const [showLyricsFullscreen, setShowLyricsFullscreen] = useState(false);
  const [activeNav, setActiveNav] = useState('songs');
  
  // Cek localStorage saat inisialisasi
  const getInitialSongs = () => {
    try {
      const data = localStorage.getItem('ronz_songs');
      if (data) {
        const parsed = JSON.parse(data).filter(Boolean).filter(item => 
          item.title?.trim() && item.artist?.trim() && item.lyrics?.trim()
        );
        return parsed.length > 0 ? parsed : [];
      }
    } catch { }
    return [];
  };
  const getInitialSetLists = () => {
    try {
      const data = localStorage.getItem('ronz_setlists');
      if (data) {
        const parsed = JSON.parse(data).filter(Boolean).filter(sl => 
          sl.name?.trim() && !sl.name.toLowerCase().includes('untitled')
        );
        return parsed.length > 0 ? parsed : [];
      }
    } catch { }
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
  const [lyricsMode, setLyricsMode] = useState(false);
  const [showSongForm, setShowSongForm] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [showSetListForm, setShowSetListForm] = useState(false);
  const [editingSetList, setEditingSetList] = useState(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [performanceMode, setPerformanceMode] = useState(false);
  const [performanceTheme, setPerformanceTheme] = useState('dark-stage');
  const [showSetlistView, setShowSetlistView] = useState(true);
  const [performanceFontSize, setPerformanceFontSize] = useState(100);
  const [recoveryNotification, setRecoveryNotification] = useState(null);
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
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });
  const [showHelp, setShowHelp] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const scrollRef = useRef(null);
  const isInitialLoad = useRef(true);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartDistance = useRef(0);

  // Keyboard shortcuts integration
  const { shortcuts } = useKeyboardShortcuts({
    onSearchFocus: () => {
      const searchInput = document.querySelector('input[placeholder*="Cari"]');
      if (searchInput) searchInput.focus();
    },
    onNextSong: () => {
      const displaySongs = getDisplaySongs();
      const currentIndex = selectedSong ? displaySongs.findIndex(s => s.id === selectedSong.id) : -1;
      if (currentIndex < displaySongs.length - 1) {
        setSelectedSong(displaySongs[currentIndex + 1]);
      }
    },
    onPrevSong: () => {
      const displaySongs = getDisplaySongs();
      const currentIndex = selectedSong ? displaySongs.findIndex(s => s.id === selectedSong.id) : -1;
      if (currentIndex > 0) {
        setSelectedSong(displaySongs[currentIndex - 1]);
      }
    },
    onToggleTranspose: () => {
      setTranspose(prev => (prev === 0 ? 1 : 0));
    },
    onTogglePerformanceMode: () => {
      setPerformanceMode(!performanceMode);
    },
    onShowHelp: () => {
      setShowKeyboardHelp(true);
    },
    onToggleLyricsMode: () => {
      setLyricsMode(!lyricsMode);
    },
    onToggleYouTube: () => {
      setShowYouTube(!showYouTube);
    },
    onToggleAutoScroll: () => {
      setAutoScrollActive(!autoScrollActive);
    }
  });

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

  // Check for setlist ID in URL parameter on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const setlistId = urlParams.get('setlist');
    if (setlistId && setLists.length > 0) {
      const foundSetlist = setLists.find(sl => sl.id === setlistId);
      if (foundSetlist) {
        setCurrentSetList(setlistId);
        setActiveNav('songs');
      }
    }
  }, [setLists]);

  // Saat online/load, merge data backend dan lokal berdasarkan updatedAt
  useEffect(() => {
    if (navigator.onLine) {
      // Check if localStorage was empty before fetch
      const wasSongsEmpty = !localStorage.getItem('ronz_songs') || 
                             localStorage.getItem('ronz_songs') === '[]';
      const wasSetlistsEmpty = !localStorage.getItem('ronz_setlists') || 
                                localStorage.getItem('ronz_setlists') === '[]';
      
      let recoveredSongs = 0;
      let recoveredSetlists = 0;
      
      Promise.all([
        fetch('/api/songs').then(res => {
          if (!res.ok) throw new Error(`Songs fetch failed: ${res.status}`);
          return res.json();
        }),
        fetch('/api/setlists').then(res => {
          if (!res.ok) throw new Error(`Setlists fetch failed: ${res.status}`);
          return res.json();
        })
      ])
        .then(([songsData, setlistsData]) => {
          const localSongs = sanitizeSongs(songs);
          const localSetLists = sanitizeSetLists(setLists);
          
          // Merge songs
          if (Array.isArray(songsData)) {
            const remoteSongs = sanitizeSongs(songsData);
            setSongs(prev => {
              const merged = [...sanitizeSongs(prev)];
              const beforeCount = merged.length;
              
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
              
              // Count recovered songs if localStorage was empty
              if (wasSongsEmpty && beforeCount === 0) {
                recoveredSongs = merged.length;
              }
              
              return merged;
            });
          }
          
          // Merge setlists
          if (Array.isArray(setlistsData)) {
            const remoteSetlists = sanitizeSetLists(setlistsData);
            
            setSetLists(prev => {
              const merged = [...sanitizeSetLists(prev)];
              const beforeCount = merged.length;
              
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
              
              // Count recovered setlists if localStorage was empty
              if (wasSetlistsEmpty && beforeCount === 0) {
                recoveredSetlists = merged.length;
              }
              
              // Show notification if any data was recovered from cloud
              const totalRecovered = recoveredSongs + recoveredSetlists;
              if (totalRecovered > 0) {
                const parts = [];
                if (recoveredSongs > 0) parts.push(`${recoveredSongs} lagu`);
                if (recoveredSetlists > 0) parts.push(`${recoveredSetlists} setlist`);
                
                setRecoveryNotification({
                  type: 'success',
                  count: totalRecovered,
                  message: `Dipulihkan: ${parts.join(' & ')} dari cloud backup`
                });
                // Auto-dismiss notification after 5 seconds
                setTimeout(() => setRecoveryNotification(null), 5000);
              }
              
              return merged;
            });
          }
        })
        .finally(() => {
          // Allow subsequent changes to sync after initial remote merge
          isInitialLoad.current = false;
        })
        .catch(err => {
          console.error('[FETCH] Failed to fetch from backend:', err);
          // Show error notification if localStorage was empty
          const wasAnyEmpty = wasSongsEmpty || wasSetlistsEmpty;
          if (wasAnyEmpty) {
            setRecoveryNotification({
              type: 'error',
              count: 0,
              message: 'Gagal terhubung ke cloud. Data akan disinkronkan saat online.'
            });
            setTimeout(() => setRecoveryNotification(null), 5000);
          }
        });
    } else {
      // If offline and local storage empty, show offline warning
      const wasSongsEmpty = !localStorage.getItem('ronz_songs') || 
                             localStorage.getItem('ronz_songs') === '[]';
      const wasSetlistsEmpty = !localStorage.getItem('ronz_setlists') || 
                                localStorage.getItem('ronz_setlists') === '[]';
      const wasAnyEmpty = wasSongsEmpty || wasSetlistsEmpty;
      
      if (wasAnyEmpty) {
        setRecoveryNotification({
          type: 'warning',
          count: 0,
          message: 'Offline: Data akan dipulihkan saat terhubung ke internet.'
        });
        setTimeout(() => setRecoveryNotification(null), 5000);
      }
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
          if (checkRes.status === 200) {
            // Update existing
            const updateRes = await fetch(`/api/setlists/${setList.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(setList)
            });
            if (!updateRes.ok) {
              const errData = await updateRes.json().catch(() => ({}));
              console.warn(`Failed to update setlist ${setList.id}: ${updateRes.status} - ${errData.error || 'Unknown'}`);
            }
          } else if (checkRes.status === 404) {
            // Create new - not found in backend
            const createRes = await fetch('/api/setlists', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(setList)
            });
            if (!createRes.ok) {
              const errData = await createRes.json().catch(() => ({}));
              console.warn(`Failed to create setlist ${setList.id}: ${createRes.status} - ${errData.error || 'Unknown'}`);
            }
          } else {
            // Any other status (400, 500, etc) - try to create/sync anyway
            const createRes = await fetch('/api/setlists', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(setList)
            });
            if (!createRes.ok) {
              const errData = await createRes.json().catch(() => ({}));
              console.warn(`Failed to sync setlist ${setList.id}: ${createRes.status} - ${errData.error || 'Unknown'}`);
            }
          }
        } catch (err) {
          console.warn(`Failed to sync setlist ${setList.id}:`, err.message);
        }
      }
    }, 500); // Reduced debounce from 1000 to 500ms for faster sync

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
    setLyricsMode(false); // Reset lyrics mode when selecting a new song
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
          body: JSON.stringify({ 
            name, 
            songs: updatedSetList.songs, 
            songKeys: updatedSetList.songKeys, 
            completedSongs: updatedSetList.completedSongs || {},
            updatedAt: updatedSetList.updatedAt 
          })
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

  // Performance Mode helpers
  const getSetListSongs = () => {
    if (!currentSetList) return [];
    const setList = setLists.find(sl => sl.id === currentSetList);
    if (!setList) return [];
    return setList.songs.map(id => songs.find(s => s.id === id)).filter(Boolean);
  };

  const getCurrentSongIndexInSetList = () => {
    if (!currentSetList || !selectedSong) return -1;
    const setListSongs = getSetListSongs();
    return setListSongs.findIndex(s => s.id === selectedSong.id);
  };

  const navigateToNextSongInSetList = () => {
    const setListSongs = getSetListSongs();
    if (setListSongs.length === 0) return;
    const currentIndex = getCurrentSongIndexInSetList();
    const nextIndex = (currentIndex + 1) % setListSongs.length;
    setSelectedSong(setListSongs[nextIndex]);
    setTranspose(0);
    setAutoScrollActive(false);
  };

  const navigateToPrevSongInSetList = () => {
    const setListSongs = getSetListSongs();
    if (setListSongs.length === 0) return;
    const currentIndex = getCurrentSongIndexInSetList();
    const prevIndex = currentIndex <= 0 ? setListSongs.length - 1 : currentIndex - 1;
    setSelectedSong(setListSongs[prevIndex]);
    setTranspose(0);
    setAutoScrollActive(false);
  };

  // Share setlist function
  const handleShareSetList = () => {
    if (!currentSetList) return;
    const setList = setLists.find(sl => sl.id === currentSetList);
    if (!setList) return;

    const songList = setList.songs
      .map((songId, index) => {
        const song = songs.find(s => s.id === songId);
        return song ? `${index + 1}. ${song.title} - ${song.artist}` : null;
      })
      .filter(Boolean)
      .join('\n');
    
    const shareText = `🎵 Set List: ${setList.name}\n\n${songList}\n\n📱 Dibuat dengan RoNz Chord Pro`;
    
    // Try Web Share API first (for mobile)
    if (navigator.share) {
      navigator.share({
        title: `Set List: ${setList.name}`,
        text: shareText
      }).catch(() => {
        // Fallback to clipboard if share is cancelled
        copyToClipboard(shareText);
      });
    } else {
      // Fallback to clipboard for desktop
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      success('Daftar lagu disalin ke clipboard!');
    }).catch(() => {
      error('Gagal menyalin ke clipboard');
    });
  };

  // Share setlist link
  const handleShareSetListLink = () => {
    if (!currentSetList) return;
    const setList = setLists.find(sl => sl.id === currentSetList);
    if (!setList) return;

    const url = `${window.location.origin}${window.location.pathname}?setlist=${currentSetList}`;
    const shareText = `🎵 Set List: ${setList.name}\n\n${url}`;
    
    // Try Web Share API first (for mobile)
    if (navigator.share) {
      navigator.share({
        title: `Set List: ${setList.name}`,
        text: shareText,
        url: url
      }).catch(() => {
        // Fallback to clipboard if share is cancelled
        navigator.clipboard.writeText(url).then(() => {
          success('Link setlist disalin ke clipboard!');
        }).catch(() => {
          error('Gagal menyalin link');
        });
      });
    } else {
      // Fallback to clipboard for desktop
      navigator.clipboard.writeText(url).then(() => {
        success('Link setlist disalin ke clipboard!');
      }).catch(() => {
        error('Gagal menyalin link');
      });
    }
  };

  const togglePerformanceMode = async () => {
    const newMode = !performanceMode;
    setPerformanceMode(newMode);
    
    if (newMode) {
      // Entering performance mode
      setShowSidebar(false);
      setShowYouTube(false);
      
      // Request wake lock to prevent screen from sleeping
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.warn('Wake Lock failed:', err);
        }
      }
    }
  };

  // Touch/Swipe Gesture Handlers
  const handleTouchStart = (e) => {
    if (!performanceMode) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    
    // For pinch zoom
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistance.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchEnd = (e) => {
    if (!performanceMode || !currentSetList) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    const threshold = 50;

    // Swipe left (next song)
    if (deltaX < -threshold && Math.abs(deltaY) < threshold / 2) {
      navigateToNextSongInSetList();
    }
    // Swipe right (prev song)
    else if (deltaX > threshold && Math.abs(deltaY) < threshold / 2) {
      navigateToPrevSongInSetList();
    }
  };

  const handleTouchMove = (e) => {
    if (!performanceMode || e.touches.length !== 2) return;
    
    // Prevent default pinch-to-zoom behavior on touch devices
    e.preventDefault();
    
    // Pinch zoom untuk font size
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const delta = distance - touchStartDistance.current;
    
    if (Math.abs(delta) > 10) {
      let newSize;
      if (delta > 0) {
        newSize = Math.min(150, performanceFontSize + 5);
      } else {
        newSize = Math.max(50, performanceFontSize - 5);
      }
      setPerformanceFontSize(newSize);
      touchStartDistance.current = distance;
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
          error('Format file tidak valid');
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
          setActiveNav('songs');
          setShowSettingsMenu(false);
          success(`Import berhasil! Lagu: ${migratedSongs.length} | Set list: ${migratedSetLists.length}`);
        }
      } catch (error) {
        console.error('Import error:', error);
        error('Gagal membaca file. Pastikan file JSON valid.');
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
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Recovery Notification */}
      {recoveryNotification && (
        <div className={`recovery-notification ${recoveryNotification.type === 'error' ? 'notification-error' : recoveryNotification.type === 'warning' ? 'notification-warning' : ''}`}>
          <div className="recovery-content">
            <span className="recovery-icon">
              {recoveryNotification.type === 'error' ? '⚠️' : 
               recoveryNotification.type === 'warning' ? '📡' : '☁️'}
            </span>
            <div className="recovery-text">
              <strong>
                {recoveryNotification.type === 'error' ? 'Koneksi Error' :
                 recoveryNotification.type === 'warning' ? 'Mode Offline' : 'Data Dipulihkan!'}
              </strong>
              <p>{recoveryNotification.message}</p>
            </div>
            <button 
              className="btn-dismiss-recovery"
              onClick={() => setRecoveryNotification(null)}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {!performanceMode && showSettingsMenu && (
        <SettingsModal
          onClose={() => setShowSettingsMenu(false)}
          onExport={handleExportDatabase}
          onImport={handleImportDatabase}
        />
      )}
      <div className={`app ${performanceMode ? 'performance-mode-active' : ''}`}>
        {!performanceMode && !selectedSong && (
          <header className="header">
            <div className="header-content">
              <h1>🎸 RoNz Chord Pro</h1>
              <p>Professional Chord & Lyrics App</p>
            </div>
          </header>
        )}

        <div className="container">
          {!performanceMode && (
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
            <button
              className="nav-btn"
              onClick={() => setShowKeyboardHelp(true)}
              title="Keyboard Shortcuts (? or Shift+?)"
            >
              ⌨️ Shortcuts
            </button>
          </nav>
          )}

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
                            <button 
                              onClick={handleShareSetList}
                              style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '0.8rem' }}
                              title="Bagikan daftar lagu"
                            >
                              📤 Bagikan
                            </button>
                            <button 
                              onClick={handleShareSetListLink}
                              style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '0.8rem' }}
                              title="Bagikan link setlist"
                            >
                              🔗 Link
                            </button>
                          </p>
                        )}
                      </div>
                      <button onClick={() => setShowSongForm(true)} className="btn btn-sm btn-primary" title="Tambah Lagu">
                        ➕
                      </button>
                    </div>
                    
                    <div className="filters-bar">
                      <div className="search-box" style={{ flex: 1, position: 'relative' }}>
                        <span className="search-icon">🔍</span>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari lagu..."
                          aria-label="Cari lagu"
                        />
                        {searchQuery && (
                          <button
                            className="btn-icon-sm"
                            onClick={() => setSearchQuery('')}
                            style={{
                              position: 'absolute',
                              right: '0.5rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.85rem',
                              opacity: 0.7
                            }}
                            title="Hapus pencarian"
                          >
                            ✕
                          </button>
                        )}
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
                  {selectedSong && !performanceMode && (
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
                      <span className="divider" />
                      {/* Lyrics Mode Toggle */}
                      <button
                        onClick={() => setLyricsMode(!lyricsMode)}
                        className={`btn btn-xs ${lyricsMode ? 'btn-primary' : ''}`}
                        title={lyricsMode ? 'Tampilkan Chord' : 'Mode Lirik Saja'}
                      >
                        📝
                      </button>
                      <span className="divider" />
                      {/* Performance Mode Toggle */}
                      <button
                        onClick={togglePerformanceMode}
                        className={`btn btn-xs ${performanceMode ? 'btn-primary' : ''}`}
                        title={performanceMode ? 'Exit Performance Mode' : 'Enter Performance Mode'}
                      >
                        🎭
                      </button>
                    </div>
                  )}
                  {!performanceMode && showYouTube && selectedSong?.youtubeId && (
                    <div className="youtube-section">
                      <YouTubeViewer
                        videoId={selectedSong.youtubeId}
                        onTimeUpdate={(t, d) => { setCurrentVideoTime(t); setVideoDuration(d); }}
                        seekToTime={viewerSeekTo}
                      />
                    </div>
                  )}
                  {/* Main content area with touch handlers for performance mode */}
                  <div 
                    className="lyrics-section" 
                    ref={scrollRef}
                    onTouchStart={performanceMode ? handleTouchStart : undefined}
                    onTouchMove={performanceMode ? handleTouchMove : undefined}
                    onTouchEnd={performanceMode ? handleTouchEnd : undefined}
                  >
                    {selectedSong ? (
                      <>
                        {!performanceMode && (Array.isArray(selectedSong.timestamps) && selectedSong.timestamps.length > 0) && (
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
                        {!performanceMode && (
                          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleEditSong(selectedSong)}
                              className="btn btn-sm btn-primary"
                              title="Edit lagu ini"
                            >
                              ✏️ Edit Lagu
                            </button>
                          </div>
                        )}
                        <ChordDisplay
                          song={selectedSong}
                          transpose={transpose}
                          performanceMode={performanceMode}
                          performanceFontSize={performanceFontSize}
                          performanceTheme={performanceTheme}
                          lyricsMode={lyricsMode}
                        />
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
                  
                  {/* Performance Mode Setlist Sidebar */}
                  {performanceMode && currentSetList && showSetlistView && (
                    <div className="performance-setlist-sidebar">
                      <div className="setlist-header">
                        <div className="setlist-title">📋 Setlist</div>
                        <button 
                          onClick={() => setShowSetlistView(false)}
                          className="btn-toggle-setlist"
                          title="Tutup setlist"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="setlist-songs">
                        {getSetListSongs().map((song, idx) => {
                          const isActive = song.id === selectedSong?.id;
                          const isCompleted = currentSetList && setLists.find(sl => sl.id === currentSetList)?.completedSongs?.[song.id];
                          return (
                            <div
                              key={song.id}
                              className={`setlist-song-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                              onClick={() => setSelectedSong(song)}
                            >
                              <div className="song-number">{idx + 1}</div>
                              <div className="song-info">
                                <div className="song-title-small">{song.title}</div>
                                <div className="song-artist-small">{song.artist}</div>
                              </div>
                              {isCompleted && <div className="completed-check">✓</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Performance Mode Footer Controls */}
                  {performanceMode && selectedSong && (
                    <div className="performance-footer">
                      <div className="performance-info">
                        <div className="performance-song-title">{selectedSong.title}</div>
                        <div>{selectedSong.artist}</div>
                        {currentSetList && (
                          <div>
                            Song {getCurrentSongIndexInSetList() + 1} of {getSetListSongs().length}
                          </div>
                        )}
                      </div>
                      
                      <div className="performance-controls">
                        {currentSetList && (
                          <>
                            <button onClick={navigateToPrevSongInSetList} className="perf-btn">
                              ⏮ Prev
                            </button>
                            <button onClick={navigateToNextSongInSetList} className="perf-btn">
                              Next ⏭
                            </button>
                            <span style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.2)' }} />
                          </>
                        )}
                        
                        <button onClick={() => handleTranspose(-1)} className="perf-btn">
                          ♭
                        </button>
                        <span style={{ color: '#fbbf24', fontWeight: '600', minWidth: '40px', textAlign: 'center' }}>
                          {transpose > 0 ? `+${transpose}` : transpose}
                        </span>
                        <button onClick={() => handleTranspose(1)} className="perf-btn">
                          ♯
                        </button>
                        <button onClick={() => setTranspose(0)} className="perf-btn">
                          ⟳
                        </button>
                        
                        <span style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.2)' }} />
                        
                        <button
                          onClick={() => setAutoScrollActive(!autoScrollActive)}
                          className={`perf-btn ${autoScrollActive ? 'perf-btn-success' : ''}`}
                        >
                          {autoScrollActive ? '⏸ Pause' : '▶ Scroll'}
                        </button>
                        {autoScrollActive && (
                          <>
                            <button onClick={() => setScrollSpeed(Math.max(0.5, scrollSpeed - 0.5))} className="perf-btn">
                              −
                            </button>
                            <span style={{ color: '#60a5fa', fontWeight: '600', minWidth: '45px', textAlign: 'center' }}>
                              {scrollSpeed.toFixed(1)}x
                            </span>
                            <button onClick={() => setScrollSpeed(Math.min(5, scrollSpeed + 0.5))} className="perf-btn">
                              +
                            </button>
                          </>
                        )}
                        
                        <span style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.2)' }} />
                        
                        {currentSetList && (
                          <button 
                            onClick={() => setShowSetlistView(!showSetlistView)}
                            className={`perf-btn ${showSetlistView ? 'perf-btn-success' : ''}`}
                            title={showSetlistView ? 'Tutup setlist' : 'Buka setlist'}
                          >
                            📋
                          </button>
                        )}
                        
                        <button 
                          onClick={() => {
                            const themes = ['dark-stage', 'bright', 'amber', 'high-contrast'];
                            const currentIdx = themes.indexOf(performanceTheme);
                            setPerformanceTheme(themes[(currentIdx + 1) % themes.length]);
                          }}
                          className="perf-btn"
                          title="Ganti theme"
                        >
                          🎨
                        </button>
                        
                        <button onClick={() => {
                          const newSize = Math.max(50, performanceFontSize - 10);
                          setPerformanceFontSize(newSize);
                        }} className="perf-btn">
                          A−
                        </button>
                        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', fontWeight: 'bold', minWidth: '45px', textAlign: 'center' }}>
                          {performanceFontSize}%
                        </span>
                        <button onClick={() => {
                          const newSize = Math.min(150, performanceFontSize + 10);
                          setPerformanceFontSize(newSize);
                        }} className="perf-btn">
                          A+
                        </button>
                        
                        <span style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.2)' }} />
                        
                        <button onClick={togglePerformanceMode} className="perf-btn perf-btn-danger perf-btn-large">
                          ✕ Exit
                        </button>
                      </div>
                    </div>
                  )}
                </>
              </main>
            )}
          </div>
        </div>

        {!performanceMode && showSongForm && (
          <SongFormBaru
            song={editingSong}
            onSave={handleSaveSong}
            onCancel={() => {
              setShowSongForm(false);
              setEditingSong(null);
            }}
          />
        )}

        {!performanceMode && showSetListForm && (
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

        {!performanceMode && showHelp && (
          <HelpModal
            onClose={() => setShowHelp(false)}
          />
        )}

        {!performanceMode && showKeyboardHelp && (
          <KeyboardShortcutsHelp 
            shortcuts={shortcuts}
            onClose={() => setShowKeyboardHelp(false)}
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
