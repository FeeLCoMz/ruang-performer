import { useState, useEffect, useRef } from 'react';
import { getTransposeSteps } from '../utils/chordUtils';

const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const sanitizeSongs = (list = []) => {
  if (!Array.isArray(list)) return [];
  return list
    .filter(Boolean)
    .filter(item => item.title?.trim() && item.artist?.trim() && item.lyrics?.trim())
    .map(item => {
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
};

// setLists: array setlist, setSetLists: setter, currentSetList: id setlist aktif, pendingSongs: array, setPendingSongs: setter
export const useSongs = (setLists, setSetLists, currentSetList, pendingSongs, setPendingSongs) => {
  const getInitialSongs = () => {
    try {
      const data = localStorage.getItem('ronz_songs');
      if (data) {
        const parsed = sanitizeSongs(JSON.parse(data));
        if (parsed.length > 0) return parsed;
      }
    } catch { }
    return [];
  };

  const [songs, setSongs] = useState(getInitialSongs);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showSongForm, setShowSongForm] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [transpose, setTranspose] = useState(0);
  const [sortBy, setSortBy] = useState('title-asc');
  const isInitialLoad = useRef(true);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ronz_songs', JSON.stringify(songs));
    } catch { }
    // Push ke backend jika online
    if (!isInitialLoad.current && navigator.onLine && songs.length > 0) {
      fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(songs)
      }).catch(() => { });
    }
  }, [songs]);

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
    if (currentSetList) {
      const setList = setLists.find(sl => sl.id === currentSetList);
      const overrideKey = setList?.songKeys?.[song.id];
      if (overrideKey && (song.key || (song.lyrics && song.lyrics.includes('{key')))) {
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
        const newSongs = [...prevSongs];
        newSongs[existingIndex] = updatedSong;
        return newSongs;
      } else {
        return [...prevSongs, updatedSong];
      }
    });

    // Jika song adalah pending (ada di pendingSongs), tambahkan ke setlist aktif dan hapus dari pending
    if (!isEditMode && pendingSongs && setPendingSongs && setSetLists && currentSetList) {
      const isPending = pendingSongs.some(p => p.id === songData.id || p.title === songData.title);
      if (isPending) {
        // Tambahkan ke setlist aktif
        setSetLists(prevSetLists => prevSetLists.map(sl => {
          if (sl.id === currentSetList) {
            const alreadyIn = (sl.songs || []).includes(songId);
            return alreadyIn ? sl : { ...sl, songs: [...(sl.songs || []), songId], updatedAt: Date.now() };
          }
          return sl;
        }));
        // Hapus dari pendingSongs
        setPendingSongs(prev => prev.filter(p => !(p.id === songData.id || p.title === songData.title)));
      }
    }

    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const endpoint = isEditMode ? `/api/songs/${songId}` : '/api/songs';
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSong)
      });
      if (!response.ok) {
        throw new Error(`Failed to save song: ${response.status}`);
      }
    } catch (err) {
      console.error('Error saving song:', err);
    }

    setShowSongForm(false);
    setEditingSong(null);
  };

  const handleDeleteSong = async (songId) => {
    if (!confirm('Hapus lagu ini?')) return;

    setSongs(prevSongs => prevSongs.filter(s => s.id !== songId));
    if (selectedSong?.id === songId) {
      setSelectedSong(null);
    }

    try {
      await fetch(`/api/songs/${songId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting song:', err);
    }
  };

  const handleEditSong = (song) => {
    setEditingSong(song);
    setShowSongForm(true);
  };

  return {
    songs,
    setSongs,
    selectedSong,
    setSelectedSong,
    showSongForm,
    setShowSongForm,
    editingSong,
    setEditingSong,
    transpose,
    setTranspose,
    sortBy,
    setSortBy,
    isInitialLoad,
    handleTranspose,
    handleSelectSong,
    handleSaveSong,
    handleDeleteSong,
    handleEditSong
  };
};
