import { useState, useRef, useEffect } from 'react';
// Google Client ID from .env (Vite injects as import.meta.env)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID;
// Fullscreen helper
function enterFullscreen(elem) {
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.mozRequestFullScreen) {
    elem.mozRequestFullScreen();
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen();
  }
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}
// ...existing code...
import ChordDisplay from './components/ChordDisplay';
import SetListSongsPage from './components/SetListSongsPage';
import YouTubeViewer from './components/YouTubeViewer';
import AutoScroll from './components/AutoScroll';
import HelpModal from './components/HelpModal';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import SongFormBaru from './components/SongForm';
import SetListForm from './components/SetListForm';
import BulkAddSongsModal from './components/BulkAddSongsModal';
import BatchProcessingModal from './components/BatchProcessingModal';
import SongListItem from './components/SongListItem';
import SettingsModal from './components/SettingsModal';
import ToastContainer from './components/ToastContainer';
import HeaderMenuDropdown from './components/HeaderMenuDropdown';
import {
  useKeyboardShortcuts,
  useToast, usePerformanceMode
} from './hooks';
import { getTransposeSteps } from './utils/chordUtils';
import './App.css';
import './lirik-dan-chord.css';

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
  // State untuk halaman daftar lagu setlist
  const [showSetListSongsPage, setShowSetListSongsPage] = useState(false);
  const [setListForSongsPage, setSetListForSongsPage] = useState(null);
  // State for setlists selected for adding a song
  const [selectedSetListsForAdd, setSelectedSetListsForAdd] = useState([]);
  // State for editing a song (null or song object)
  const [editingSong, setEditingSong] = useState(null);
  // Google Drive Sync State
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  // State for editing setlist (null or setlist object)
  const [editingSetList, setEditingSetList] = useState(null);
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
  const [setLists, setSetLists] = useState(getInitialSetLists);

  // Sync setListForSongsPage setiap kali setLists berubah dan sedang di halaman detail setlist
  useEffect(() => {
    if (showSetListSongsPage && setListForSongsPage) {
      const updated = setLists.find(sl => sl.id === setListForSongsPage.id);
      if (updated) setSetListForSongsPage(updated);
    }
  }, [setLists, showSetListSongsPage]);

  // Load Google API script
  useEffect(() => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      setGapiLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => setGapiLoaded(true);
    document.body.appendChild(script);
  }, []);

  // Google OAuth2 login
  const handleGoogleLogin = () => {
    if (!gapiLoaded || !GOOGLE_CLIENT_ID) {
      alert('Google API belum siap atau Client ID belum diatur.');
      return;
    }
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        // Parse JWT for user info
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        setGoogleUser(JSON.parse(jsonPayload));
      },
    });
    window.google.accounts.id.prompt();
  };

  const handleDriveUpload = () => {
    if (!googleUser) {
      alert('Login Google dulu sebelum upload.');
      return;
    }
    alert('Fitur upload ke Google Drive akan diimplementasikan setelah login.');
  };
  const handleDriveDownload = () => {
    if (!googleUser) {
      alert('Login Google dulu sebelum download.');
      return;
    }
    alert('Fitur download dari Google Drive akan diimplementasikan setelah login.');
  };
  // Export songs and setlists as JSON
  const handleExportData = () => {
    const data = {
      songs: sanitizeSongs(songs),
      setLists: sanitizeSetLists(setLists)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ronz-chordpro-export.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Import songs and setlists from JSON
  const handleImportData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (Array.isArray(data.songs)) setSongs(sanitizeSongs(data.songs));
        if (Array.isArray(data.setLists)) setSetLists(sanitizeSetLists(data.setLists));
        localStorage.setItem('ronz_songs', JSON.stringify(data.songs || []));
        localStorage.setItem('ronz_setlists', JSON.stringify(data.setLists || []));
        alert('Import sukses!');
      } catch (err) {
        alert('Gagal import: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };


  // State for YouTube viewer seek
  const [viewerSeekTo, setViewerSeekTo] = useState(null);
  // State for auto-scroll
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  // State for YouTube video duration
  const [videoDuration, setVideoDuration] = useState(0);
  // State for current YouTube video time
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  // State for selected song
  const [selectedSong, setSelectedSong] = useState(null);
  // State for YouTube player visibility
  const [showYouTube, setShowYouTube] = useState(false);
  // State for YouTube sync
  const [youtubeSync, setYoutubeSync] = useState(() => {
    try {
      return localStorage.getItem('ronz_youtube_sync') === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('ronz_youtube_sync', youtubeSync ? 'true' : 'false');
    } catch { }
  }, [youtubeSync]);

  // Ref for lyrics section
  const lyricsSectionRef = useRef(null);
  // Ref for YouTubeViewer (for play/pause)
  const youtubePlayerRef = useRef(null);

  // Effect: sync auto-scroll with YouTube
  useEffect(() => {
    if (!youtubeSync || !showYouTube || !selectedSong?.youtubeId) return;
    if (!autoScrollActive) setAutoScrollActive(true);
    // Scroll lyrics as video plays
    const totalDuration = videoDuration || 1;
    const scrollEl = lyricsSectionRef.current;
    if (!scrollEl) return;
    const onTime = (t) => {
      const frac = Math.min(1, Math.max(0, t / totalDuration));
      const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
      scrollEl.scrollTop = frac * maxScroll;
    };
    let lastTime = 0;
    const interval = setInterval(() => {
      if (!showYouTube || !youtubeSync) return;
      if (typeof currentVideoTime === 'number') {
        if (Math.abs(currentVideoTime - lastTime) > 0.2) {
          onTime(currentVideoTime);
          lastTime = currentVideoTime;
        }
      }
    }, 300);
    return () => clearInterval(interval);
  }, [youtubeSync, showYouTube, selectedSong, currentVideoTime, videoDuration, autoScrollActive]);
  // State untuk dark mode
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('ronz_dark_mode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });
  // Theme effect: apply class to body
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    document.body.classList.toggle('light-mode', !darkMode);
    try {
      localStorage.setItem('ronz_dark_mode', darkMode ? 'true' : 'false');
    } catch { }
  }, [darkMode]);
  // ...existing code...
  // Fungsi untuk memainkan suara klik metronome
  const playMetronomeClick = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1200;
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
      osc.onended = () => ctx.close();
    } catch { }
  };
  // State untuk metronome
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [metronomeBpm, setMetronomeBpm] = useState(80);
  const [metronomeTick, setMetronomeTick] = useState(false);

  useEffect(() => {
    if (selectedSong && selectedSong.tempo) {
      const tempoNum = parseInt(selectedSong.tempo, 10);
      if (!isNaN(tempoNum) && tempoNum > 0) {
        setMetronomeBpm(tempoNum);
      }
    }
  }, [selectedSong]);

  // Metronome effect (visual blink)
  useEffect(() => {
    if (!metronomeActive) return;
    const interval = setInterval(() => {
      setMetronomeTick(t => !t);
    }, 60000 / metronomeBpm);
    return () => clearInterval(interval);
  }, [metronomeActive, metronomeBpm]);

  // Mainkan suara klik setiap metronomeTick (saat aktif)
  useEffect(() => {
    if (metronomeActive) playMetronomeClick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metronomeTick]);
  // State untuk mode lirik saja
  const [lyricsMode, setLyricsMode] = useState(false);
  // State untuk error runtime
  const [runtimeErrors, setRuntimeErrors] = useState([]);
  // State untuk menampilkan popup setlist
  const [showSetListPopup, setShowSetListPopup] = useState(false);
  // State untuk menampilkan modal bulk add songs
  const [showBulkAddSongs, setShowBulkAddSongs] = useState(false);
  // State untuk menampilkan form setlist
  const [showSetListForm, setShowSetListForm] = useState(false);
  // State untuk menampilkan form lagu
  const [showSongForm, setShowSongForm] = useState(false);
  // State untuk menampilkan menu pengaturan
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  // State untuk notifikasi recovery data
  const [recoveryNotification, setRecoveryNotification] = useState(null);
  // State untuk urutan daftar lagu
  const [sortBy, setSortBy] = useState('title-asc');
  // State untuk urutan naik/turun
  const [sortOrder, setSortOrder] = useState('asc');
  // State untuk pencarian lagu
  const [searchQuery, setSearchQuery] = useState('');
  // State untuk setlist aktif
  const [currentSetList, setCurrentSetList] = useState(null);
  // UI state (paling atas sebelum useEffect)
  const [showSidebar, setShowSidebar] = useState(true);
  const [showLyricsFullscreen, setShowLyricsFullscreen] = useState(false);
  const [activeNav, setActiveNav] = useState('songs');
  const [keyboardMode, setKeyboardMode] = useState(() => localStorage.getItem('keyboardMode') === 'true');
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
  const [songs, setSongs] = useState(getInitialSongs);
  const [transpose, setTranspose] = useState(0);
  const [scrollSpeed, setScrollSpeed] = useState(1);

  // Gunakan state dari usePerformanceMode
  const {
    performanceMode,
    setPerformanceMode,
    performanceTheme,
    setPerformanceTheme,
    performanceFontSize,
    setPerformanceFontSize,
    showSetlistView,
    setShowSetlistView,
    togglePerformanceMode } = usePerformanceMode();


  // Shortcut keyboard untuk mengatur kecepatan auto-scroll (Ctrl+ArrowUp/ArrowDown)
  useEffect(() => {
    function handleScrollSpeedShortcut(e) {
      if (!performanceMode) return;
      if (e.ctrlKey && e.key === 'ArrowUp') {
        e.preventDefault();
        setScrollSpeed(prev => Math.min(5, prev + 0.5));
      }
      if (e.ctrlKey && e.key === 'ArrowDown') {
        e.preventDefault();
        setScrollSpeed(prev => Math.max(0.5, prev - 0.5));
      }
    }
    window.addEventListener('keydown', handleScrollSpeedShortcut);
    return () => window.removeEventListener('keydown', handleScrollSpeedShortcut);
  }, [performanceMode]);
  // (hapus seluruh deklarasi useState duplikat di bawah ini, sudah ada di atas)
  const [showBatchProcessing, setShowBatchProcessing] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('ronz_view_mode') || 'default';
    } catch {
      return 'default';
    }
  });

  // Toast notifications
  const { toasts, closeToast, success, error } = useToast();

  // Shortcut keyboard untuk perbesar/perkecil font pada performance mode
  useEffect(() => {
    function handleFontSizeShortcut(e) {
      if (!performanceMode) return;
      // Ctrl + + atau Ctrl + = untuk memperbesar
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setPerformanceFontSize(prev => Math.min(150, prev + 10));
      }
      // Ctrl + - untuk memperkecil
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setPerformanceFontSize(prev => Math.max(50, prev - 10));
      }
      // Ctrl + 0 untuk reset
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setPerformanceFontSize(100);
      }
    }
    window.addEventListener('keydown', handleFontSizeShortcut);
    return () => window.removeEventListener('keydown', handleFontSizeShortcut);
  }, [performanceMode]);
  const [showHelp, setShowHelp] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const scrollRef = useRef(null);
  const perfMainRef = useRef(null);
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
    onToggleFullscreen: () => {
      if (!performanceMode) return;
      if (document.fullscreenElement) {
        exitFullscreen();
      } else if (perfMainRef.current) {
        enterFullscreen(perfMainRef.current);
      }
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
    const isEditMode = !!editingSong?.id; // True if editing existing song (has ID)
    const songId = isEditMode ? editingSong.id : generateUniqueId();
    const now = Date.now();
    const updatedSong = { ...songData, id: songId, updatedAt: now };

    // Check if this is a pending song being created
    const pendingSongName = !isEditMode && editingSong?.title ? editingSong.title : null;
    const isPendingSongCreation = pendingSongName && currentSetList;

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

    // If creating from pending, replace pending entry with actual song ID in setlist
    if (isPendingSongCreation) {
      let updatedSetList = null;
      setSetLists(prevSetLists => {
        return prevSetLists.map(setList => {
          if (setList.id === currentSetList) {
            // Find and replace pending song name with actual ID
            // Ganti hanya pendingSongName dengan songId, dan hapus string pendingSongName jika masih ada (jaga-jaga duplikat)
            let newSongs = setList.songs
              .map(s => s === pendingSongName ? songId : s)
              .filter(item => !(typeof item === 'string' && item === pendingSongName));
            const next = {
              ...setList,
              songs: newSongs,
              updatedAt: Date.now()
            };
            updatedSetList = next;
            return next;
          }
          return setList;
        });
      });

      // Sync updated setlist to database
      if (updatedSetList) {
        try {
          await fetch(`/api/setlists/${currentSetList}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: updatedSetList.name,
              songs: updatedSetList.songs,
              songKeys: updatedSetList.songKeys,
              completedSongs: updatedSetList.completedSongs,
              updatedAt: updatedSetList.updatedAt
            })
          });
        } catch (err) {
          console.error('Gagal update setlist dengan pending song:', err);
        }
      }
    }

    // Sync song to database
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

  const handleApplyBatchResults = async (results) => {
    // Apply batch processing results to songs
    const updatePromises = [];

    setSongs(prevSongs => {
      return prevSongs.map(song => {
        const suggestion = results.find(r => r.songId === song.id);
        if (suggestion) {
          const updated = {
            ...song,
            key: suggestion.key || song.key,
            tempo: suggestion.tempo || song.tempo,
            style: suggestion.style || song.style,
            youtubeId: suggestion.youtubeId || song.youtubeId,
            updatedAt: Date.now()
          };

          // Sync to database
          updatePromises.push(
            fetch(`/api/songs/${song.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updated)
            }).catch(err => console.error('Gagal update lagu:', err))
          );

          return updated;
        }
        return song;
      });
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    success(`✅ ${results.length} lagu berhasil diupdate`);
    setShowBatchProcessing(false);
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
        body: JSON.stringify({
          ...newSetList,
          songs: JSON.stringify(newSetList.songs || []),
          songKeys: JSON.stringify(newSetList.songKeys || {}),
          completedSongs: JSON.stringify(newSetList.completedSongs || {})
        })
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
            songs: JSON.stringify(updatedSetList.songs || []),
            songKeys: JSON.stringify(updatedSetList.songKeys || {}),
            completedSongs: JSON.stringify(updatedSetList.completedSongs || {}),
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
    try {
      const res = await fetch(`/api/setlists/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Gagal menghapus setlist di database');
      }
      setSetLists(prevSetLists => prevSetLists.filter(sl => sl.id !== id));
      setCurrentSetList(null);
    } catch (err) {
      console.error('Gagal menghapus setlist:', err);
      alert('Gagal menghapus setlist di database.');
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
          body: JSON.stringify({
            name: updatedSetList.name,
            songs: JSON.stringify(updatedSetList.songs || []),
            songKeys: JSON.stringify(updatedSetList.songKeys || {}),
            completedSongs: JSON.stringify(updatedSetList.completedSongs || {}),
            updatedAt: updatedSetList.updatedAt
          })
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
          body: JSON.stringify({
            name: updatedSetList.name,
            songs: JSON.stringify(updatedSetList.songs || []),
            songKeys: JSON.stringify(updatedSetList.songKeys || {}),
            completedSongs: JSON.stringify(updatedSetList.completedSongs || {}),
            updatedAt: updatedSetList.updatedAt
          })
        });
      } catch (err) {
        console.error('Gagal menghapus lagu dari setlist:', err);
      }
    }
  };

  // Handle bulk adding songs to setlist
  const handleBulkAddSongsToSetList = async (songData) => {
    if (!currentSetList) return;

    // Handle both old format (array) and new format (object with ids and pendingNames)
    let songIds = [];
    let pendingSongNames = [];
    let totalAdded = 0;

    if (Array.isArray(songData)) {
      // Old format - just IDs
      songIds = songData;
      totalAdded = songIds.length;
    } else if (songData && typeof songData === 'object') {
      // New format - object with ids and pendingNames
      songIds = songData.ids || [];
      pendingSongNames = songData.pendingNames || [];
      totalAdded = songIds.length + pendingSongNames.length;
    }

    if (totalAdded === 0) return;

    let updatedSetList = null;
    setSetLists(prevSetLists => {
      return prevSetLists.map(setList => {
        if (setList.id === currentSetList) {
          // Combine existing songs with new song IDs and pending names
          const newSongs = [...(setList.songs || []), ...songIds];
          // Add pending song names as strings
          const allSongs = [...new Set([...newSongs, ...pendingSongNames])];

          const next = {
            ...setList,
            songs: allSongs,
            songKeys: setList.songKeys || {},
            updatedAt: Date.now()
          };
          updatedSetList = next;
          return next;
        }
        return setList;
      });
    });

    if (updatedSetList) {
      try {
        await fetch(`/api/setlists/${currentSetList}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: updatedSetList.name,
            songs: updatedSetList.songs,
            songKeys: updatedSetList.songKeys,
            completedSongs: updatedSetList.completedSongs,
            updatedAt: updatedSetList.updatedAt
          })
        });

        let message = `Berhasil menambahkan ${totalAdded} lagu ke setlist`;
        if (pendingSongNames.length > 0) {
          message += ` (${songIds.length} ada + ${pendingSongNames.length} pending)`;
        }
        success(message);
        setShowBulkAddSongs(false);
      } catch (err) {
        console.error('Gagal menambah lagu ke setlist:', err);
        error('Gagal menambahkan lagu ke setlist');
      }
    }
  };

  // Update/setlist-specific key override for a song

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
          body: JSON.stringify({
            name: updatedSetList.name,
            songs: JSON.stringify(updatedSetList.songs || []),
            songKeys: JSON.stringify(updatedSetList.songKeys || {}),
            completedSongs: JSON.stringify(updatedSetList.completedSongs || {}),
            updatedAt: updatedSetList.updatedAt
          })
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
    // Filter only actual songs (IDs), exclude pending song names (strings)
    return setList.songs
      .map(id => {
        // Only process if it looks like an ID (not a plain string without matching song)
        if (typeof id === 'string') {
          const song = songs.find(s => s.id === id);
          return song || null;
        }
        return null;
      })
      .filter(Boolean);
  };

  const getPendingSongsInSetList = () => {
    if (!currentSetList) return [];
    const setList = setLists.find(sl => sl.id === currentSetList);
    if (!setList) return [];
    // Ensure setList.songs is always an array
    let songArr = setList.songs;
    if (typeof songArr === 'string') {
      try {
        songArr = JSON.parse(songArr);
      } catch {
        songArr = [];
      }
    }
    if (!Array.isArray(songArr)) songArr = [];
    // Filter pending song names (strings that don't match any song ID)
    const pending = songArr.filter(item => {
      if (typeof item !== 'string') return false;
      // Check if this string ID exists in actual songs
      const exists = songs.find(s => s.id === item);
      return !exists;
    });
    // Tidak lagi auto-create song dengan prompt artist
    // Pending song hanya akan tampil sebagai pending sampai user create manual
    return pending;
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

  // (hapus togglePerformanceMode lokal, gunakan dari usePerformanceMode)

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

  // Handler untuk menghapus semua setlist kosong
  const handleDeleteEmptySetlists = async () => {
    // Defensive: treat songs as array
    const emptySetlists = setLists.filter(sl => {
      let songArr = sl.songs;
      if (typeof songArr === 'string') {
        try { songArr = JSON.parse(songArr); } catch { songArr = []; }
      }
      return !Array.isArray(songArr) || songArr.length === 0;
    });
    if (emptySetlists.length === 0) {
      alert('Tidak ada setlist kosong yang bisa dihapus.');
      return;
    }
    // Hapus dari database satu per satu
    for (const sl of emptySetlists) {
      try {
        await fetch(`/api/setlists/${sl.id}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Gagal menghapus setlist kosong:', sl.id, err);
      }
    }
    // Hapus dari state
    setSetLists(prev => prev.filter(sl => {
      let songArr = sl.songs;
      if (typeof songArr === 'string') {
        try { songArr = JSON.parse(songArr); } catch { songArr = []; }
      }
      return Array.isArray(songArr) && songArr.length > 0;
    }));
    alert(`Berhasil menghapus ${emptySetlists.length} setlist kosong.`);
  };

  // Get display songs
  const getDisplaySongs = () => {
    let base = songs;
    if (currentSetList) {
      const setList = setLists.find(sl => sl.id === currentSetList);
      if (setList) {
        let songIds = setList.songs;
        // Defensive: parse if string (from backend)
        if (typeof songIds === 'string') {
          try {
            songIds = JSON.parse(songIds);
          } catch {
            songIds = [];
          }
        }
        if (!Array.isArray(songIds)) songIds = [];
        base = songIds.map(id => songs.find(s => s.id === id)).filter(Boolean);
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
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'artist-asc':
        sorted.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
        break;
      case 'newest':
        sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      case 'style':
        sorted.sort((a, b) => (a.style || '').localeCompare(b.style || ''));
        break;
      case 'tempo':
        sorted.sort((a, b) => (a.tempo || 0) - (b.tempo || 0));
        break;
      case 'updated':
        sorted.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        break;
      default:
        break;
    }

    // Apply Asc/Desc toggle for supported sortBy
    if (['title-asc', 'artist-asc', 'newest', 'style', 'tempo', 'updated'].includes(sortBy) && sortOrder === 'desc') {
      sorted.reverse();
    }

    return sorted;
  };

  const displaySongs = getDisplaySongs();

  // Handler untuk menghapus semua pending songs dari setlist aktif
  const handleRemoveAllPendingSongs = () => {
    if (!currentSetList) return;
    setSetLists(prev => prev.map(sl => {
      if (sl.id !== currentSetList) return sl;
      // Ambil semua ID lagu yang sudah ada
      const songIds = songs.map(s => s.id);
      return {
        ...sl,
        songs: Array.isArray(sl.songs)
          ? sl.songs.filter(item => {
            // Jika item string dan BUKAN ID lagu, artinya pending, maka hapus
            if (typeof item === 'string' && !songIds.includes(item)) return false;
            return true;
          })
          : sl.songs
      };
    }));
  };

  return (
    <>
      {/* ...Google login bar removed... */}
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
          onKeyboardModeChange={setKeyboardMode}
          onDeleteEmptySetlists={handleDeleteEmptySetlists}
        />
      )}

      <div className={`app ${performanceMode ? 'performance-mode-active' : ''}`}>

        {!performanceMode && (
          <header className="header">
            <div className="header-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>🎸 RoNz Chord Pro</h1>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>Professional Chord & Lyrics App</span>
              </div>
              {!performanceMode && (
                <nav className="nav-panel" style={{ background: 'none', border: 'none', padding: 0, gap: 8 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
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
                  </div>
                  {keyboardMode && (
                    <span
                      className="keyboard-mode-badge"
                      title="Keyboardist Mode Enabled"
                      style={{
                        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                        color: '#4da6ff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: '1px solid #4da6ff',
                        marginLeft: 8
                      }}
                    >
                      🎹 Keyboardist
                    </span>
                  )}
                </nav>
              )}
              <HeaderMenuDropdown
                onToggleDarkMode={() => setDarkMode(!darkMode)}
                darkMode={darkMode}
                onShowSettings={() => setShowSettingsMenu(true)}
                onShowHelp={() => setShowHelp(true)}
                onShowShortcuts={() => setShowKeyboardHelp(true)}
              />
            </div>
          </header>
        )}

        <div className="container">
          <div className="top-controls">
            <>
              {selectedSong && !performanceMode && (
                <div className="controls controls-compact">
                  {/* Transpose Group */}
                  <button onClick={() => handleTranspose(-1)} className="btn btn-xs" title="Transpose turun (♭)">♭</button>
                  <span className="transpose-value" style={{ minWidth: 32, textAlign: 'center' }} title="Nilai transpose">{transpose > 0 ? `+${transpose}` : transpose}</span>
                  <button onClick={() => handleTranspose(1)} className="btn btn-xs" title="Transpose naik (♯)">♯</button>
                  <button onClick={() => setTranspose(0)} className="btn btn-xs" title="Reset transpose">⟳</button>
                  {/* Metronome Controls */}
                  <span className="divider" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => setMetronomeActive(a => !a)}
                      className={`btn btn-xs ${metronomeActive ? 'btn-primary' : ''}`}
                      title={metronomeActive ? 'Stop Metronome' : 'Start Metronome'}
                    >
                      {metronomeActive ? '⏹' : '🕒'}
                    </button>
                    <span style={{ minWidth: 36, textAlign: 'center', fontWeight: 600 }} title="Tempo (BPM)">{metronomeBpm} BPM</span>
                    <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 6, marginLeft: 4, background: metronomeActive ? (metronomeTick ? '#f87171' : '#fbbf24') : '#ddd', transition: 'background 0.1s' }} />
                  </div>
                  {/* Auto Scroll Group */}
                  <button
                    onClick={() => setAutoScrollActive(!autoScrollActive)}
                    className={`btn btn-xs ${autoScrollActive ? 'btn-primary' : ''}`}
                    title={autoScrollActive ? 'Matikan Auto Scroll' : 'Aktifkan Auto Scroll'}
                  >
                    {autoScrollActive ? '⏸' : '▶'}
                  </button>
                  {autoScrollActive && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => setScrollSpeed(Math.max(0.1, scrollSpeed - 0.1))} className="btn btn-xs" title="Kurangi kecepatan scroll">−</button>
                      <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={scrollSpeed}
                        onChange={e => setScrollSpeed(Number(e.target.value))}
                        style={{ width: 70, verticalAlign: 'middle' }}
                        title="Geser untuk atur kecepatan scroll" />
                      <span className="speed-value" style={{ minWidth: 32, textAlign: 'center', fontWeight: 600 }} title="Kecepatan scroll">{scrollSpeed.toFixed(1)}x</span>
                      <button onClick={() => setScrollSpeed(Math.min(5, scrollSpeed + 0.5))} className="btn btn-xs" title="Tambah kecepatan scroll">+</button>
                    </div>
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
                  {/* Lyrics Mode Toggle */}
                  <button
                    onClick={() => setLyricsMode(!lyricsMode)}
                    className={`btn btn-xs ${lyricsMode ? 'btn-primary' : ''}`}
                    title={lyricsMode ? 'Tampilkan Chord' : 'Mode Lirik Saja'}
                  >
                    📝
                  </button>
                  {/* Performance Mode Toggle */}
                  <button
                    onClick={togglePerformanceMode}
                    className={`btn btn-xs ${performanceMode ? 'btn-primary' : ''}`}
                    title={performanceMode ? 'Exit Performance Mode' : 'Enter Performance Mode'}
                  >
                    🎭
                  </button>
                  {/* Tombol tambah ke setlist */}
                  <button
                    onClick={() => {
                      // Tampilkan popup setlist
                      setShowSetListPopup(true);
                      setSelectedSetListsForAdd(
                        setLists.filter(sl => sl.songs.includes(selectedSong.id)).map(sl => sl.id)
                      );
                    }}
                    className="btn btn-sm btn-success"
                    title="Tambah lagu ini ke setlist"
                  >
                    ➕
                  </button>
                  <button
                    onClick={() => handleEditSong(selectedSong)}
                    className="btn btn-sm btn-primary"
                    title="Edit lagu ini"
                  >
                    ✏️
                  </button>

                </div>
              )}
            </>
          </div>
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
                        {currentSetList && (() => {
                          const setList = setLists.find(sl => sl.id === currentSetList);
                          if (!setList) return null;
                          // Pending songs: string di setList.songs yang bukan id lagu
                          const songIds = songs.map(s => s.id);
                          const pendingSongs = Array.isArray(setList.songs)
                            ? setList.songs.filter(item => typeof item === 'string' && !songIds.includes(item))
                            : [];
                          return (
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              Setlist: {setList.name}
                              <button
                                onClick={() => setCurrentSetList(null)}
                                style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '0.8rem' }}
                              >
                                ✕ Lihat Semua
                              </button>
                              <button
                                onClick={handleShareSetList}
                                style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '0.8rem' }}
                                title="Bagikan daftar lagu"
                              >
                                📤 Bagikan
                              </button>
                              <button
                                onClick={handleShareSetListLink}
                                style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '0.8rem' }}
                                title="Bagikan link setlist"
                              >
                                🔗 Link
                              </button>
                              {pendingSongs.length > 0 && (
                                <button
                                  onClick={handleRemoveAllPendingSongs}
                                  style={{ background: '#ff922b', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', marginLeft: '0.5rem' }}
                                  title="Hapus semua pending songs dari setlist ini"
                                >
                                  🗑️ Hapus Semua Pending Songs
                                </button>
                              )}
                            </p>
                          );
                        })()}
                      </div>
                      <button onClick={() => setShowSongForm(true)} className="btn btn-sm btn-primary" title="Tambah Lagu">
                        ➕
                      </button>
                      {currentSetList && (
                        <>
                          <button
                            onClick={() => setShowBulkAddSongs(true)}
                            className="btn btn-sm btn-primary"
                            title="Tambah Lagu ke Setlist dari Daftar"
                          >
                            📝
                          </button>
                          <button
                            onClick={() => setShowBatchProcessing(true)}
                            className="btn btn-sm btn-primary"
                            title="Update metadata untuk multiple lagu sekaligus"
                          >
                            🔄
                          </button>
                        </>
                      )}
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
                        onChange={e => {
                          setSortBy(e.target.value);
                          // Reset sortOrder ke default saat ganti sortBy
                          if (['title-asc', 'artist-asc', 'newest', 'style', 'tempo', 'updated'].includes(e.target.value)) {
                            setSortOrder('asc');
                          }
                        }}
                      >
                        <option value="title-asc">📋 Judul</option>
                        <option value="artist-asc">🎤 Artis</option>
                        <option value="newest">🕒 Terbaru</option>
                        <option value="style">🎼 Style</option>
                        <option value="tempo">⏱️ Tempo</option>
                        <option value="updated">📝 Diupdate</option>
                      </select>
                      {/* Toggle Asc/Desc */}
                      <button
                        style={{ marginLeft: 4 }}
                        onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                        title={sortOrder === 'asc' ? 'Urutkan Z-A/Desc' : 'Urutkan A-Z/Asc'}
                      >
                        {sortOrder === 'asc' ? '⬆️' : '⬇️'}
                      </button>

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

                      {/* Pending Songs Section */}
                      {currentSetList && getPendingSongsInSetList().length > 0 && (
                        <>
                          <div style={{ gridColumn: '1 / -1', padding: '1rem 0', borderTop: '2px solid var(--border)', marginTop: '1rem' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                              ⏳ Lagu Pending (Menunggu Dibuat)
                            </h3>
                          </div>
                          {getPendingSongsInSetList().map(songName => (
                            <div
                              key={`pending-${songName}`}
                              style={{
                                padding: '1rem',
                                border: '2px dashed var(--primary)',
                                borderRadius: '0.5rem',
                                backgroundColor: 'var(--card-hover)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem'
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                                  ⏳ {songName}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  Belum ada di database
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => {
                                    setShowSongForm(true);
                                    // Split jika format 'Artis - Judul Lagu'
                                    let title = songName;
                                    let artist = '';
                                    if (songName.includes(' - ')) {
                                      const parts = songName.split(' - ');
                                      if (parts.length > 1) {
                                        title = parts[0].trim();
                                        artist = parts.slice(1).join(' - ').trim();
                                      }
                                    }
                                    const newSong = {
                                      title,
                                      artist,
                                      key: 'C',
                                      lyrics: '',
                                      youtubeId: '',
                                      tempo: '',
                                      style: '',
                                      timestamps: []
                                    };
                                    setEditingSong(newSong);
                                  }}
                                  className="btn btn-sm btn-primary"
                                  title="Buat lagu baru dengan nama ini"
                                  style={{ flex: 1 }}
                                >
                                  ➕ Buat Sekarang
                                </button>
                                <button
                                  onClick={() => {
                                    // Remove pending song from setlist
                                    if (!currentSetList) return;
                                    let updatedSetList = null;
                                    setSetLists(prevSetLists => {
                                      return prevSetLists.map(setList => {
                                        if (setList.id === currentSetList) {
                                          const next = {
                                            ...setList,
                                            songs: setList.songs.filter(s => s !== songName),
                                            updatedAt: Date.now()
                                          };
                                          updatedSetList = next;
                                          return next;
                                        }
                                        return setList;
                                      });
                                    });
                                    if (updatedSetList) {
                                      fetch(`/api/setlists/${currentSetList}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          name: updatedSetList.name,
                                          songs: updatedSetList.songs,
                                          songKeys: updatedSetList.songKeys,
                                          completedSongs: updatedSetList.completedSongs,
                                          updatedAt: updatedSetList.updatedAt
                                        })
                                      }).catch(err => console.error('Gagal hapus pending song:', err));
                                    }
                                  }}
                                  className="btn btn-sm"
                                  title="Hapus dari setlist"
                                  style={{ flex: 1 }}
                                >
                                  ✕ Hapus
                                </button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {activeNav === 'setlists' && !showSetListSongsPage && (
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
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setCurrentSetList(setList.id);
                              setSetListForSongsPage(setList);
                              setShowSetListSongsPage(true);
                            }}
                          >
                            <div className="setlist-card-header">
                              <h3>📋 {setList.name}</h3>
                              <div className="setlist-card-actions" onClick={e => e.stopPropagation()}>
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
                              {(() => {
                                // Always treat songs as array
                                let songArr = setList.songs;
                                if (typeof songArr === 'string') {
                                  try { songArr = JSON.parse(songArr); } catch { songArr = []; }
                                }
                                if (!Array.isArray(songArr)) songArr = [];
                                // Only count completed songs that are in the setlist
                                const completed = Object.keys(setList.completedSongs || {}).filter(id => songArr.includes(id));
                                return (
                                  <p className="song-count">
                                    {songArr.length} lagu
                                    {' • '}
                                    <span style={{ color: 'var(--success)', fontWeight: '600' }}>
                                      ✓ {completed.length}
                                    </span>
                                    {' selesai'}
                                  </p>
                                );
                              })()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeNav === 'setlists' && showSetListSongsPage && (
                  <SetListSongsPage
                    setList={setListForSongsPage}
                    songs={songs}
                    onBack={() => setShowSetListSongsPage(false)}
                    onSongClick={songId => {
                      const song = songs.find(s => s.id === songId);
                      if (song) {
                        setSelectedSong(song);
                        setShowSetListSongsPage(false);
                      }
                    }}
                    onRemoveSongFromSetList={(setListId, songId) => {
                      handleRemoveSongFromSetList(setListId, songId);
                      setSetListForSongsPage(prev => {
                        const updated = setLists.find(sl => sl.id === setListId);
                        return updated || prev;
                      });
                    }}
                    onSetListSongKey={async (setListId, songId, keyTampil) => {
                      let updatedSetList = null;
                      setSetLists(prevSetLists => {
                        return prevSetLists.map(setList => {
                          if (setList.id === setListId) {
                            const next = { ...setList, songKeys: { ...(setList.songKeys || {}) }, updatedAt: Date.now() };
                            if (keyTampil && keyTampil.trim()) {
                              next.songKeys[songId] = keyTampil.trim();
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
                            body: JSON.stringify({
                              name: updatedSetList.name,
                              songs: JSON.stringify(updatedSetList.songs || []),
                              songKeys: JSON.stringify(updatedSetList.songKeys || {}),
                              completedSongs: JSON.stringify(updatedSetList.completedSongs || {}),
                              updatedAt: updatedSetList.updatedAt
                            })
                          });
                        } catch (err) {
                          console.error('Gagal update key tampil:', err);
                        }
                      }
                    }}
                    onMoveSong={async (setListId, fromIdx, toIdx) => {
                      if (fromIdx === toIdx || toIdx < 0) return;
                      let updatedSetList = null;
                      setSetLists(prevSetLists => {
                        return prevSetLists.map(setList => {
                          if (setList.id === setListId) {
                            const songsArr = Array.isArray(setList.songs) ? [...setList.songs] : [];
                            const [removed] = songsArr.splice(fromIdx, 1);
                            songsArr.splice(toIdx, 0, removed);
                            const next = { ...setList, songs: songsArr, updatedAt: Date.now() };
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
                            body: JSON.stringify({
                              name: updatedSetList.name,
                              songs: JSON.stringify(updatedSetList.songs || []),
                              songKeys: JSON.stringify(updatedSetList.songKeys || {}),
                              completedSongs: JSON.stringify(updatedSetList.completedSongs || {}),
                              updatedAt: updatedSetList.updatedAt
                            })
                          });
                        } catch (err) {
                          console.error('Gagal update urutan lagu:', err);
                        }
                      }
                    }}
                    onSetListSongCompleted={async (setListId, songId, checked) => {
                      // checked: true = mark as completed, false = unmark
                      let updatedSetList = null;
                      setSetLists(prevSetLists => {
                        return prevSetLists.map(setList => {
                          if (setList.id === setListId) {
                            const next = { ...setList, completedSongs: { ...(setList.completedSongs || {}) }, updatedAt: Date.now() };
                            if (checked) {
                              next.completedSongs[songId] = Date.now();
                            } else {
                              delete next.completedSongs[songId];
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
                            body: JSON.stringify({
                              name: updatedSetList.name,
                              songs: JSON.stringify(updatedSetList.songs || []),
                              songKeys: JSON.stringify(updatedSetList.songKeys || {}),
                              completedSongs: JSON.stringify(updatedSetList.completedSongs || {}),
                              updatedAt: updatedSetList.updatedAt
                            })
                          });
                        } catch (err) {
                          console.error('Gagal update status completed lagu:', err);
                        }
                      }
                    }}
                  />
                )}
              </>
            ) : (

              <main className="main">
                <>
                  {/* Render YouTubeViewer di mode normal dan performance (hidden) agar ref tetap aktif */}
                  {selectedSong?.youtubeId && (
                    <div
                      className="youtube-section"
                      style={{ display: (!performanceMode && showYouTube) ? 'block' : 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <label style={{ fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={youtubeSync}
                            onChange={e => setYoutubeSync(e.target.checked)}
                            style={{ marginRight: 6 }} />
                          Sinkronisasi Auto-Scroll dengan YouTube
                        </label>
                      </div>
                      <YouTubeViewer
                        ref={youtubePlayerRef}
                        videoId={selectedSong.youtubeId}
                        onTimeUpdate={(t, d) => { setCurrentVideoTime(t); setVideoDuration(d); }}
                        seekToTime={viewerSeekTo} />
                    </div>
                  )}
                  {/* Main content area with touch handlers for performance mode */}
                  <div className="lyrics-section"
                    ref={el => {
                      scrollRef.current = el;
                      lyricsSectionRef.current = el;
                      if (performanceMode) perfMainRef.current = el;
                    }}
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
                                  title={`Loncat ke ${ts.label}: ${Math.floor(ts.time / 60)}:${(ts.time % 60).toString().padStart(2, '0')}`}
                                  onClick={() => {
                                    if (selectedSong?.youtubeId) {
                                      setShowYouTube(true);
                                      setViewerSeekTo(Math.max(0, Number(ts.time) || 0));
                                      setTimeout(() => setViewerSeekTo(null), 0);
                                    }
                                  }}
                                >
                                  {ts.label} ({Math.floor(ts.time / 60)}:{(ts.time % 60).toString().padStart(2, '0')})
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* highlight chords checkbox removed */}
                        <ChordDisplay
                          song={selectedSong}
                          transpose={transpose}
                          performanceMode={performanceMode}
                          performanceFontSize={performanceFontSize}
                          performanceTheme={performanceTheme}
                          lyricsMode={lyricsMode}
                          keyboardMode={keyboardMode}
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
                    scrollRef={scrollRef} />

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
                      <div className="performance-controls" style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => {
                            if (document.fullscreenElement) {
                              exitFullscreen();
                            } else if (perfMainRef.current) {
                              enterFullscreen(perfMainRef.current);
                            }
                          }}
                          className="perf-btn"
                          title="Toggle Fullscreen (F11)"
                          style={{ fontSize: 22, minWidth: 44, minHeight: 44 }}
                        >
                          {document.fullscreenElement ? '🗗' : '🗖'}
                        </button>
                        {/* YouTube Controls: Play/Pause, Stop, Scrubber */}
                        {selectedSong.youtubeId && youtubePlayerRef.current && (
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <input
                              type="range"
                              min={0}
                              max={Math.max(1, Math.floor(videoDuration))}
                              step={1}
                              value={Math.floor(youtubePlayerRef.current.currentTime || 0)}
                              onChange={e => {
                                if (youtubePlayerRef.current && youtubePlayerRef.current.handleSeek) {
                                  youtubePlayerRef.current.handleSeek(e.target.value);
                                }
                              }}
                              style={{ minWidth: 90, maxWidth: 140, marginRight: 4, touchAction: 'none' }}
                              title="Scrub waktu video"
                            />
                            <button
                              className="perf-btn"
                              title="Play/Pause YouTube Video"
                              style={{ fontSize: 22, minWidth: 44, minHeight: 44 }}
                              onClick={() => {
                                if (youtubePlayerRef.current) {
                                  youtubePlayerRef.current.handlePlayPause();
                                }
                              }}
                            >
                              {youtubePlayerRef.current.isPlaying ? '⏸' : '▶'}
                            </button>
                            <button
                              className="perf-btn"
                              title="Stop YouTube Video"
                              style={{ fontSize: 22, minWidth: 44, minHeight: 44 }}
                              onClick={() => {
                                if (youtubePlayerRef.current && youtubePlayerRef.current.handleStop) {
                                  youtubePlayerRef.current.handleStop();
                                }
                              }}
                            >
                              ⏹
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="performance-info">
                        <div className="performance-song-title">{selectedSong.title}</div>
                        <div>{selectedSong.artist}</div>
                        {/* Metronome Controls (Performance Mode) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 12 }}>
                          <button
                            onClick={() => setMetronomeActive(a => !a)}
                            className={`perf-btn ${metronomeActive ? 'perf-btn-success' : ''}`}
                            title={metronomeActive ? 'Stop Metronome' : 'Start Metronome'}
                          >
                            {metronomeActive ? '⏹' : '🕒'}
                          </button>
                          <span style={{ minWidth: 36, textAlign: 'center', fontWeight: 600 }} title="Tempo (BPM)">{metronomeBpm} BPM</span>
                          <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 7, marginLeft: 4, background: metronomeActive ? (metronomeTick ? '#f87171' : '#fbbf24') : '#ddd', transition: 'background 0.1s' }} />
                        </div>
                        {/* ...existing code... */}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button onClick={() => setScrollSpeed(Math.max(0.1, scrollSpeed - 0.1))} className="perf-btn">−</button>
                            <input
                              type="range"
                              min="0.1"
                              max="5"
                              step="0.1"
                              value={scrollSpeed}
                              onChange={e => setScrollSpeed(Number(e.target.value))}
                              style={{ width: 90, verticalAlign: 'middle' }}
                              title="Geser untuk atur kecepatan scroll" />
                            <span style={{ color: '#60a5fa', fontWeight: '600', minWidth: '45px', textAlign: 'center' }}>
                              {scrollSpeed.toFixed(1)}x
                            </span>
                            <button onClick={() => setScrollSpeed(Math.min(5, scrollSpeed + 0.1))} className="perf-btn">+</button>
                          </div>
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

        {!performanceMode && showBulkAddSongs && currentSetList && (
          <BulkAddSongsModal
            songs={songs}
            currentSetList={setLists.find(sl => sl.id === currentSetList)}
            onAddSongs={handleBulkAddSongsToSetList}
            onAddNewSong={({ title, artist }) => {
              setShowBulkAddSongs(false);
              setEditingSong({ title, artist, key: 'C', lyrics: '', youtubeId: '', tempo: '', style: '', timestamps: [] });
              setShowSongForm(true);
            }}
            onCancel={() => setShowBulkAddSongs(false)}
          />
        )}

        {!performanceMode && showBatchProcessing && currentSetList && (
          <BatchProcessingModal
            songs={(() => {
              const setList = setLists.find(sl => sl.id === currentSetList);
              if (!setList || !Array.isArray(setList.songs)) return songs;
              const songIds = songs.map(s => s.id);
              // Ambil pending songs (string yang bukan id lagu)
              const pendingSongs = setList.songs
                .filter(item => typeof item === 'string' && !songIds.includes(item))
                .map(name => ({ id: name, title: name, artist: '', isPending: true }));
              // Gabungkan dengan songs yang ada di setlist
              const setListSongs = setList.songs
                .map(item => {
                  if (typeof item === 'string') {
                    const song = songs.find(s => s.id === item);
                    return song || null;
                  }
                  return songs.find(s => s.id === item) || null;
                })
                .filter(Boolean);
              // Gabungkan dan hilangkan duplikat berdasarkan id
              const allSongs = [...setListSongs, ...pendingSongs];
              const uniqueSongs = [];
              const seen = new Set();
              for (const s of allSongs) {
                if (!seen.has(s.id)) {
                  uniqueSongs.push(s);
                  seen.add(s.id);
                }
              }
              return uniqueSongs;
            })()}
            currentSetList={setLists.find(sl => sl.id === currentSetList)}
            onClose={() => setShowBatchProcessing(false)}
            onApplySuggestions={handleApplyBatchResults}
          />
        )}

        {/* SetListPickerModal removed as requested */}

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