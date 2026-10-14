import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchSetListById, fetchSongs, updateSetList } from '../apiClient.js';

/**
 * PerformanceDock
 *
 * Bar mengambang khusus Mode Performance di halaman lagu dalam setlist.
 * Berisi tiga hal yang dibutuhkan di panggung:
 *  1. Navigasi lagu sebelumnya/berikutnya yang selalu terjangkau jempol.
 *  2. Tombol daftar lagu setlist aktif — buka modal, tap lagu, langsung pindah.
 *  3. Tombol cari lagu — cari lagu di luar setlist (mis. ada request)
 *     dan buka chord-nya tanpa keluar dari alur performance.
 */
export default function PerformanceDock({
  setlist: setlistProp,
  songs,
  currentSongId,
}) {
  const navigate = useNavigate();
  const { setlistId } = useParams();
  const [activePanel, setActivePanel] = useState(null); // null | 'list' | 'search'
  const [searchText, setSearchText] = useState('');
  const searchInputRef = useRef(null);

  // Sumber kebenaran setlist: prop dari router state, tapi JANGAN bergantung
  // padanya — state navigasi bisa kosong saat refresh/langsung buka URL.
  // Jadi selalu ambil data fresh dari API (cache offline sebagai fallback).
  const [fetchedSetlist, setFetchedSetlist] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!setlistId) {
      setFetchedSetlist(null);
      return undefined;
    }
    fetchSetListById(setlistId)
      .then((data) => {
        if (!cancelled && data) setFetchedSetlist(data);
      })
      .catch((err) => {
        console.error('PerformanceDock: gagal memuat setlist', err);
      });
    return () => {
      cancelled = true;
    };
  }, [setlistId]);

  const setlist = useMemo(() => {
    // Prioritaskan data fresh dari API; prop router hanya fallback awal.
    if (fetchedSetlist && Array.isArray(fetchedSetlist.songs)) return fetchedSetlist;
    return setlistProp || fetchedSetlist || null;
  }, [fetchedSetlist, setlistProp]);

  // Jika koleksi lagu global belum tersedia lewat prop (mis. App masih memuat),
  // ambil sendiri dari API supaya pencarian tetap berfungsi.
  const [fetchedSongs, setFetchedSongs] = useState([]);
  useEffect(() => {
    if (Array.isArray(songs) && songs.length > 0) return undefined; // sudah ada dari prop
    let cancelled = false;
    fetchSongs()
      .then((data) => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.songs) ? data.songs : [];
        if (!cancelled && list.length > 0) setFetchedSongs(list);
      })
      .catch((err) => console.error('PerformanceDock: gagal memuat lagu', err));
    return () => {
      cancelled = true;
    };
  }, [songs]);

  const allSongs = useMemo(() => {
    if (Array.isArray(songs) && songs.length > 0) return songs;
    return Array.isArray(fetchedSongs) ? fetchedSongs : [];
  }, [songs, fetchedSongs]);
  const setlistSongsRaw = useMemo(
    () => (Array.isArray(setlist?.songs) ? setlist.songs : []),
    [setlist?.songs]
  );
  const completedSongs = typeof setlist?.completedSongs === 'object' && !Array.isArray(setlist.completedSongs)
    ? setlist.completedSongs
    : {};

  // Urutan lagu setlist sesuai data setlist aktif, dipetakan ke data lagu.
  const setlistSongs = useMemo(() => (
    setlistSongsRaw.map((songId) => {
      const song = allSongs.find((s) => String(s.id) === String(songId));
      if (!song) {
        return { id: songId, title: '[Lagu dihapus]', artist: '', deleted: true };
      }
      return song;
    })
  ), [setlistSongsRaw, allSongs]);

  const currentIndex = setlistSongs.findIndex((s) => String(s.id) === String(currentSongId));
  const prevSong = currentIndex > 0 ? setlistSongs[currentIndex - 1] : null;
  const nextSong = currentIndex >= 0 && currentIndex < setlistSongs.length - 1 ? setlistSongs[currentIndex + 1] : null;

  // Lagu yang TIDAK ada di setlist — target pencarian request dadakan.
  const setlistSongIdSet = useMemo(
    () => new Set(setlistSongsRaw.map((id) => String(id))),
    [setlistSongsRaw]
  );

  const searchResults = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return [];
    return allSongs
      .filter((song) =>
        (song.title || '').toLowerCase().includes(term) ||
        (song.artist || '').toLowerCase().includes(term)
      )
      .slice(0, 30);
  }, [allSongs, searchText]);

  useEffect(() => {
    if (activePanel === 'search') {
      // Fokuskan input pencarian begitu panel terbuka.
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    if (activePanel !== null) {
      setSearchText('');
    }
  }, [activePanel]);

  useEffect(() => {
    if (!activePanel) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setActivePanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePanel]);

  // Menu "Metronom" di bottom nav performance: navigasi kembali ke lagu
  // saat ini dengan flag auto-start metronom, karena kontrol metronom
  // sebenarnya tinggal di panel player lagu (SongChordsPage).
  useEffect(() => {
    const onMetronomeToggle = () => {
      const current = setlistSongs.find((s) => String(s.id) === String(currentSongId));
      if (current && !current.deleted) {
        navigate(`/setlists/${setlist.id}/songs/${current.id}`, {
          state: { setlistId: setlist.id, setlist, setlistSong: current, autoStartMetronome: true },
        });
      }
    };
    window.addEventListener('performance-metronome-toggle', onMetronomeToggle);
    return () => window.removeEventListener('performance-metronome-toggle', onMetronomeToggle);
  }, [setlistSongs, currentSongId, setlist, navigate]);

  const goToSetlistSong = (song) => {
    setActivePanel(null);
    const sid = setlist?.id || setlistId;
    if (!sid) return;
    navigate(`/setlists/${sid}/songs/${song.id}`, {
      state: { setlistId: sid, setlist, setlistSong: song },
    });
  };

  const goToStandaloneSong = (song) => {
    setActivePanel(null);
    navigate(`/songs/view/${song.id}`);
  };

  // Gesture swipe kiri/kanan untuk pindah lagu tanpa menyentuh dock.
  // Swipe kanan = lagu sebelumnya, swipe kiri = lagu berikutnya (kebanyakan
  // aplikasi musik memakai konvensi ini). Dipasang di window dan hanya aktif
  // saat tidak ada panel terbuka supaya tidak mengganggu interaksi lain.
  const touchStartRef = useRef(null);
  useEffect(() => {
    if (activePanel) return undefined;

    const HORIZONTAL_MIN = 60;   // minimal jarak horizontal (px)
    const VERTICAL_MAX = 80;     // toleransi gerakan vertikal (px)

    const onTouchStart = (e) => {
      const touch = e.touches?.[0];
      if (!touch) return;
      // Abaikan swipe yang dimulai dari elemen interaktif/scrollable agar
      // tidak konflik dengan scroll lirik dan tombol.
      const target = e.target;
      if (target instanceof Element && target.closest('input, textarea, select, a, button, .song-lyrics-display')) {
        touchStartRef.current = null;
        return;
      }
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = (e) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;
      const touch = e.changedTouches?.[0];
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < HORIZONTAL_MIN || Math.abs(dy) > VERTICAL_MAX) return;

      if (dx > 0 && prevSong) {
        goToSetlistSong(prevSong);
      } else if (dx < 0 && nextSong) {
        goToSetlistSong(nextSong);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, prevSong, nextSong, setlist?.id, setlistId]);

  // Tambah lagu hasil pencarian langsung ke setlist aktif, lalu buka chord-nya
  // dalam konteks setlist — alur request dadakan: cari, tambah, mainkan.
  const [addingSongId, setAddingSongId] = useState(null);
  const [addSongError, setAddSongError] = useState('');
  const addSongsToActiveSetlist = async (song) => {
    if (!setlist || addingSongId) return;
    setAddingSongId(song.id);
    setAddSongError('');
    try {
      const currentSongs = Array.isArray(setlist.songs) ? [...setlist.songs] : [];
      if (!currentSongs.map(String).includes(String(song.id))) {
        currentSongs.push(song.id);
      }
      const updated = { ...setlist, songs: currentSongs };
      await updateSetList({
        id: updated.id,
        name: updated.name,
        description: updated.description,
        bandId: updated.bandId ?? null,
        songs: updated.songs,
      });
      setFetchedSetlist(updated);
      setActivePanel(null);
      navigate(`/setlists/${setlist.id}/songs/${song.id}`, {
        state: { setlistId: setlist.id, setlist: updated, setlistSong: song },
      });
    } catch (err) {
      setAddSongError(err.message || 'Gagal menambah lagu ke setlist');
    } finally {
      setAddingSongId(null);
    }
  };

  if (!setlist) return null;

  return (
    <>
      {/* Bar mengambang di bawah layar — selalu terjangkau jempol */}
      <div className="performance-dock" role="toolbar" aria-label="Kontrol performance">
        <button
          type="button"
          className="btn performance-dock-nav-btn"
          disabled={!prevSong}
          onClick={() => goToSetlistSong(prevSong)}
          title={prevSong ? `Sebelumnya: ${prevSong.title}` : 'Tidak ada lagu sebelumnya'}
          aria-label="Lagu sebelumnya"
        >
          ◀
        </button>

        <button
          type="button"
          className="btn btn-secondary performance-dock-panel-btn"
          onClick={() => setActivePanel(activePanel === 'list' ? null : 'list')}
          aria-expanded={activePanel === 'list'}
          title="Daftar lagu di setlist ini"
        >
          📋 <span className="performance-dock-count">
            {currentIndex >= 0 ? currentIndex + 1 : '–'}/{setlistSongs.length}
          </span>
        </button>

        <button
          type="button"
          className="btn btn-secondary performance-dock-panel-btn"
          onClick={() => setActivePanel(activePanel === 'search' ? null : 'search')}
          aria-expanded={activePanel === 'search'}
          title="Cari lagu di luar setlist"
        >
          🔎 <span className="performance-dock-btn-label">Cari</span>
        </button>

        <button
          type="button"
          className="btn performance-dock-nav-btn"
          disabled={!nextSong}
          onClick={() => goToSetlistSong(nextSong)}
          title={nextSong ? `Berikutnya: ${nextSong.title}` : 'Tidak ada lagu berikutnya'}
          aria-label="Lagu berikutnya"
        >
          ▶
        </button>
      </div>

      {/* Panel daftar lagu setlist */}
      {activePanel === 'list' && (
        <div
          className="performance-dock-overlay"
          onClick={() => setActivePanel(null)}
          tabIndex={-1}
        >
          <div
            className="performance-dock-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Daftar lagu setlist"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="performance-dock-panel-header">
              <span>📋 {setlist.name || 'Setlist'}</span>
              <button
                type="button"
                className="btn btn-secondary performance-dock-close-btn"
                onClick={() => setActivePanel(null)}
                aria-label="Tutup daftar"
              >
                ✕
              </button>
            </div>
            <div className="performance-dock-panel-body">
              {setlistSongs.map((song, idx) => (
                <button
                  key={song.id}
                  type="button"
                  className={`performance-dock-song-row${String(song.id) === String(currentSongId) ? ' current' : ''}${song.deleted ? ' deleted' : ''}`}
                  onClick={() => !song.deleted && goToSetlistSong(song)}
                  disabled={song.deleted}
                >
                  <span className="performance-dock-song-number">{idx + 1}</span>
                  <span className="performance-dock-song-title">
                    {song.title}
                    {song.artist ? ` — ${song.artist}` : ''}
                  </span>
                  {completedSongs[song.id] === true && (
                    <span className="performance-dock-song-done" title="Sudah dibawakan">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Panel cari lagu di luar setlist */}
      {activePanel === 'search' && (
        <div
          className="performance-dock-overlay"
          onClick={() => setActivePanel(null)}
          tabIndex={-1}
        >
          <div
            className="performance-dock-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Cari lagu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="performance-dock-panel-header">
              <span>🔎 Cari Lagu</span>
              <button
                type="button"
                className="btn btn-secondary performance-dock-close-btn"
                onClick={() => setActivePanel(null)}
                aria-label="Tutup pencarian"
              >
                ✕
              </button>
            </div>
            <div className="performance-dock-search-wrap">
              <input
                ref={searchInputRef}
                type="text"
                className="performance-dock-search-input"
                placeholder="Ketik judul atau artis..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="performance-dock-panel-body">
              {searchText.trim() === '' ? (
                <div className="performance-dock-hint">
                  Cari lagu yang di-request penonton. Lagu yang sudah ada di setlist ditandai 📋.
                </div>
              ) : searchResults.length === 0 ? (
                <div className="performance-dock-hint">
                  Tidak ada lagu yang cocok di koleksi kamu.
                  <a
                    className="performance-dock-google-link"
                    href={`https://www.google.com/search?q=${encodeURIComponent(`chord ${searchText.trim()}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setActivePanel(null)}
                  >
                    🔍 Cari chord "{searchText.trim()}" di Google
                  </a>
                </div>
              ) : (
                searchResults.map((song) => {
                  const inSetlist = setlistSongIdSet.has(String(song.id));
                  return (
                    <div key={song.id} className="performance-dock-song-row-wrap">
                      <button
                        type="button"
                        className="performance-dock-song-row"
                        onClick={() => (inSetlist ? goToSetlistSong(song) : goToStandaloneSong(song))}
                      >
                        <span className="performance-dock-song-title">
                          {song.title}
                          {song.artist ? ` — ${song.artist}` : ''}
                        </span>
                        {inSetlist ? (
                          <span className="performance-dock-song-inlist" title="Sudah ada di setlist">📋</span>
                        ) : (
                          <span className="performance-dock-song-request" title="Buka chord lagu ini">↗</span>
                        )}
                      </button>
                      {!inSetlist && (
                        <button
                          type="button"
                          className="btn performance-dock-add-btn"
                          disabled={addingSongId === song.id}
                          onClick={() => addSongsToActiveSetlist(song)}
                          title={`Tambah "${song.title}" ke setlist ini`}
                          aria-label={`Tambah ${song.title} ke setlist`}
                        >
                          {addingSongId === song.id ? '…' : '＋'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
              {addSongError && (
                <div className="performance-dock-hint performance-dock-error">{addSongError}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
