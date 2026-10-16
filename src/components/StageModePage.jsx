import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import ChordDisplay from './ChordDisplay.jsx';
import AutoScrollControl from './AutoScrollControl.jsx';
import TransposeKeyControl from './TransposeKeyControl.jsx';
import SongMediaPanel from './SongMediaPanel.jsx';
import { useSongFetch } from '../hooks/useSongFetch.js';
import * as apiClient from '../apiClient.js';
import { STORAGE_KEYS } from '../utils/storageKeys.js';
import { getTransposeSteps, extractDetectedInstrumentsFromLyrics } from '../utils/chordUtils.js';

/* ======== Helpers ======== */

const readStored = (key) => {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

const writeStored = (key, value) => {
  try {
    if (value) localStorage.setItem(key, String(value));
    else localStorage.removeItem(key);
  } catch { /* ignore */ }
};

const formatDuration = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (v) => String(v).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
};

const extractYouTubeId = (input) => {
  const raw = String(input || '');
  if (!raw) return '';
  if (/^[\w-]{11}$/.test(raw)) return raw;
  const match = raw.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:.*v=|v\/|embed\/|shorts\/|live\/))([\w-]{11})/);
  return match ? match[1] : '';
};

/**
 * StageModePage
 * Halaman khusus Stage Mode: tampil fullscreen di atas seluruh UI saat
 * Stage Mode aktif (toggle di app header). Dibuat untuk dipakai pemain saat
 * manggung:
 *
 *  - Memilih BAND dan SETLIST yang akan dibawakan (persist lintas sesi).
 *  - Memilih lagu dalam setlist — dengan navigasi cepat antar lagu.
 *  - Melihat lirik & chord kontras tinggi + info penting (key, BPM, genre,
 *    instrumen, struktur section).
 *  - Mendengarkan bagian tertentu pada lagu: player YouTube + time marker
 *    yang bisa diklik untuk loncat ke bagian itu.
 *  - Beralih ke lagu berikutnya/sebelumnya dengan cepat (tombol footer).
 *  - Mencari lagu dari setlist, seluruh aplikasi, maupun langsung ke
 *    Google/YouTube bila belum ada di aplikasi.
 *
 * Esc / tombol ✕ menonaktifkan Stage Mode (onExit).
 */
export default function StageModePage({ stageMode, onExit, songs: songsProp = [], activeSetlist: initialSetlist = null }) {
  // =========================
  // Data band & setlist
  // =========================
  const [bands, setBands] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [bandId, setBandId] = useState(() => readStored(STORAGE_KEYS.STAGE_BAND));
  const [setlistId, setSetlistId] = useState(() => readStored(STORAGE_KEYS.STAGE_SETLIST));
  const [selectedSongId, setSelectedSongId] = useState(() => readStored(STORAGE_KEYS.STAGE_SONG));
  const [dataLoading, setDataLoading] = useState(true);
  const [allSongs, setAllSongs] = useState(Array.isArray(songsProp) ? songsProp : []);

  // Ambil band, setlist, dan repertoire saat Stage Mode menyala.
  useEffect(() => {
    if (!stageMode) return undefined;
    let cancelled = false;
    setDataLoading(true);
    Promise.allSettled([apiClient.fetchBands(), apiClient.fetchSetLists(), apiClient.fetchSongs()])
      .then(([bandsRes, setlistsRes, songsRes]) => {
        if (cancelled) return;
        setBands(Array.isArray(bandsRes.value) ? bandsRes.value : []);
        setSetlists(Array.isArray(setlistsRes.value) ? setlistsRes.value : []);
        if (Array.isArray(songsRes.value) && songsRes.value.length > 0) {
          setAllSongs(songsRes.value);
        }
        setDataLoading(false);
      });
    return () => { cancelled = true; };
  }, [stageMode]);

  // =========================
  // Setlist aktif
  // =========================
  // Setlist aktif = setlist yang sedang dibuka di mode normal (initialSetlist
  // dari App). Jika Stage Mode diaktifkan di luar halaman setlist, pakai
  // preferensi tersimpan. Lagu aktif tetap dari preferensi tersimpan.
  useEffect(() => {
    if (!stageMode || !initialSetlist?.id) return;
    if (String(setlistId) !== String(initialSetlist.id)) {
      setSetlistId(String(initialSetlist.id));
      writeStored(STORAGE_KEYS.STAGE_SETLIST, String(initialSetlist.id));
    }
  }, [stageMode, initialSetlist?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeSetlist = useMemo(
    () => (initialSetlist?.id ? initialSetlist : setlists.find((sl) => String(sl.id) === String(setlistId)) || null),
    [initialSetlist, setlists, setlistId],
  );

  // Daftar setlist untuk sheet pemilih, terfilter per band.
  const filteredSetlists = useMemo(() => {
    if (!bandId) return setlists;
    return setlists.filter((sl) => String(sl.bandId || '') === String(bandId) || !sl.bandId);
  }, [setlists, bandId]);

  const handleSelectBand = (nextBandId) => {
    setBandId(nextBandId);
    writeStored(STORAGE_KEYS.STAGE_BAND, nextBandId);
    // Setlist aktif mungkin bukan milik band ini — pindah ke setlist pertama band.
    const firstSetlist = setlists.find(
      (sl) => !nextBandId || String(sl.bandId || '') === String(nextBandId),
    );
    const nextSetlistId = firstSetlist ? String(firstSetlist.id) : '';
    setSetlistId(nextSetlistId);
    writeStored(STORAGE_KEYS.STAGE_SETLIST, nextSetlistId);
    setSelectedSongId('');
    writeStored(STORAGE_KEYS.STAGE_SONG, '');
    // Wizard berurutan: setelah band, lanjut ke pemilihan setlist.
    if (setupStep === 'band') setSetupStep('setlist');
  };

  const handleSelectSetlist = (nextSetlistId) => {
    setSetlistId(nextSetlistId);
    writeStored(STORAGE_KEYS.STAGE_SETLIST, nextSetlistId);
    setSelectedSongId('');
    writeStored(STORAGE_KEYS.STAGE_SONG, '');
    if (setupStep) {
      // Setup selesai — lanjut ke daftar lagu setlist yang baru dipilih.
      setSetupStep(null);
      setSheetOpen('song');
    } else {
      setSheetOpen('song');
    }
  };

  // =========================
  // Lagu aktif
  // =========================
  // Lagu dari setlist (urutan panggung) dengan meta key/tempo override.
  const setlistSongMeta = typeof activeSetlist?.setlistSongMeta === 'object' && activeSetlist?.setlistSongMeta !== null
    ? activeSetlist.setlistSongMeta
    : {};
  const setlistSongs = useMemo(() => {
    const order = Array.isArray(activeSetlist?.songs) ? activeSetlist.songs : [];
    return order
      .map((entry) => {
        const id = typeof entry === 'object' && entry !== null ? String(entry.id) : String(entry);
        const base = allSongs.find((s) => String(s.id) === id) || (typeof entry === 'object' ? entry : null);
        const meta = setlistSongMeta[id] || {};
        if (!base) return null;
        return {
          ...base,
          key: meta.key || base.key,
          tempo: meta.tempo || base.tempo,
          genre: meta.genre || base.genre,
        };
      })
      .filter(Boolean);
  }, [activeSetlist, allSongs, setlistSongMeta]);

  const currentIndex = setlistSongs.findIndex((s) => String(s.id) === String(selectedSongId));
  const effectiveSongId = selectedSongId || setlistSongs[0]?.id || null;

  // Detail lagu: dari repertoire di memori, atau fetch via hook (cache offline
  // + auth header) bila belum ada.
  const songFromList = useMemo(
    () => allSongs.find((s) => String(s.id) === String(effectiveSongId)) || null,
    [allSongs, effectiveSongId],
  );
  const { song: fetchedSong, loading: songLoading } = useSongFetch(songFromList ? null : effectiveSongId);

  const song = useMemo(() => {
    const base = songFromList || fetchedSong;
    if (!base) return null;
    const meta = setlistSongMeta[String(base.id)] || {};
    return {
      ...base,
      key: meta.key || base.key,
      tempo: meta.tempo || base.tempo,
      genre: meta.genre || base.genre,
    };
  }, [songFromList, fetchedSong, setlistSongMeta]);

  const goToSong = (id) => {
    const next = String(id);
    setSelectedSongId(next);
    writeStored(STORAGE_KEYS.STAGE_SONG, next);
    setSheetOpen(null);
  };

  // =========================
  // Performance state
  // =========================
  const [transpose, setTranspose] = useState(0);
  const [fontScale, setFontScale] = useState(1.4);
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(120);
  const [autoScrollMode, setAutoScrollMode] = useState('MUSICAL');
  const [manualSpeedLevel, setManualSpeedLevel] = useState(5);
  const [sheetOpen, setSheetOpen] = useState(null); // null | 'song' | 'band' | 'search'
  // Wizard setup berurutan saat Stage Mode pertama aktif: 'band' → 'setlist' →
  // null. Null = setup selesai / dilewati karena sudah ada setlist aktif.
  const [setupStep, setSetupStep] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(false);

  // Reset kontrol performance saat pindah lagu.
  useEffect(() => {
    setTranspose(0);
    setAutoScrollActive(false);
    setScrollSpeed(Number(song?.tempo) || 120);
    setPlayerVisible(false);
  }, [effectiveSongId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wizard setup berurutan: saat data setlist selesai dimuat dan belum ada
  // setlist aktif, mulai dari memilih BAND lalu SETLIST. Jika sudah ada
  // setlist aktif (dari halaman setlist atau preferensi), wizard dilewati.
  useEffect(() => {
    if (!stageMode || dataLoading) return;
    const hasActive = Boolean(activeSetlist || setlistId);
    if (!hasActive && setupStep === null) {
      setSetupStep('band');
    }
  }, [stageMode, dataLoading, activeSetlist, setlistId, setupStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // BPM lagu aktif — dipakai autoscroll (MUSICAL), LED header, dan kontrol.
  const bpm = Math.max(40, Math.min(240, Number(song?.tempo) || 120));

  // Autoscroll: digerakkan di sini (container .stage-mode-body). Kecepatan:
  // mode MUSICAL dari BPM (baris per detik), MANUAL dari level px/s.
  useEffect(() => {
    const container = stageBodyRef.current;
    if (!stageMode || !autoScrollActive || !container) return undefined;

    let rafId = null;
    let lastTs = null;
    let accumulator = 0;

    const measure = () => {
      // Tinggi blok per baris lirik (chord + baris liriknya).
      const lineEls = Array.from(container.querySelectorAll('.cd-chord, .cd-number, .cd-lyrics-line'));
      let lineStep = 24;
      if (lineEls.length > 1) {
        const distance = Math.round(lineEls[1].getBoundingClientRect().top - lineEls[0].getBoundingClientRect().top);
        if (Number.isFinite(distance) && distance > 8) lineStep = distance;
      }
      // Waktu per baris lagu: bar count dari baris chord (1 chord-line = 1 bar).
      const barCount = Math.max(1, container.querySelectorAll('.cd-chord, .cd-number').length || 1);
      const secondsPerBar = barCount > 0 ? (60 / bpm) : 4;
      const musicalSpeed = (lineStep * barCount) / (secondsPerBar * barCount); // ≈ lineStep / secondsPerBar
      const manualSpeed = 10 + (Number(manualSpeedLevel) || 5) * 10; // level 1-10 → 20-110 px/s
      return autoScrollMode === 'MANUAL' ? manualSpeed : Math.max(4, musicalSpeed || 24);
    };

    const step = (ts) => {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(100, ts - lastTs);
      lastTs = ts;
      accumulator += (measure() * dt) / 1000;
      if (accumulator >= 1) {
        const px = Math.floor(accumulator);
        accumulator -= px;
        container.scrollTop += px;
        // Berhenti otomatis di akhir lirik.
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 2) {
          setAutoScrollActive(false);
          return;
        }
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [stageMode, autoScrollActive, autoScrollMode, manualSpeedLevel, bpm, song?.id]);

  // Auto-apply transpose bila key setlist berbeda dari key lagu master.
  useEffect(() => {
    const originalKey = song?.key || '';
    const setlistKey = setlistSongMeta[String(song?.id)]?.key || '';
    if (!originalKey || !setlistKey || originalKey === setlistKey) return;
    const steps = getTransposeSteps(originalKey, setlistKey);
    if (steps !== null) setTranspose(steps);
  }, [song?.id, song?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const youtubeRef = useRef(null);
  const stageBodyRef = useRef(null);
  const [isYoutubePlaying, setIsYoutubePlaying] = useState(false);
  const [ytCurrentTime, setYtCurrentTime] = useState(0);
  const [ytDuration, setYtDuration] = useState(0);
  const timeMarkers = Array.isArray(song?.time_markers) ? song.time_markers : [];

  // Poll status playback video (sejajar SongChordsPage).
  const youtubeId = extractYouTubeId(song?.youtubeId || song?.youtube_url || '');
  useEffect(() => {
    if (!youtubeId || !playerVisible) {
      setIsYoutubePlaying(false);
      return undefined;
    }
    const intervalId = setInterval(() => {
      const player = youtubeRef.current;
      if (!player || typeof player.getPlayerState !== 'function') return;
      setIsYoutubePlaying(player.getPlayerState() === 1);
    }, 500);
    return () => clearInterval(intervalId);
  }, [youtubeId, playerVisible]);

  // Esc keluar Stage Mode; kunci scroll body saat aktif.
  useEffect(() => {
    if (!stageMode) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') onExit?.();
    };
    window.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [stageMode, onExit]);

  // ======== Gestur panggung ========
  // - Pinch (2 jari): perbesar/perkecil font lirik (fontScale).
  // - Wheel + Ctrl : perbesar/perkecil font lirik (desktop).
  // - Swipe horizontal: pindah lagu sebelumnya/berikutnya.
  const gestureRef = useRef({ pinchActive: false, startDistance: 0, startFontScale: 1.4, touchStartX: 0, touchStartY: 0, swiped: false });

  useEffect(() => {
    const el = stageBodyRef.current;
    if (!stageMode || !el) return undefined;
    const g = gestureRef.current;

    const getDistance = (touches) => Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    );

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        g.pinchActive = true;
        g.startDistance = getDistance(e.touches);
        g.startFontScale = Number(fontScale) || 1.4;
      } else if (e.touches.length === 1) {
        g.touchStartX = e.touches[0].clientX;
        g.touchStartY = e.touches[0].clientY;
        g.swiped = false;
      }
    };

    const handleTouchMove = (e) => {
      if (g.pinchActive && e.touches.length === 2) {
        e.preventDefault();
        const ratio = getDistance(e.touches) / (g.startDistance || 1);
        const next = Math.min(3, Math.max(0.85, g.startFontScale * ratio));
        setFontScale(next);
      }
    };

    const handleTouchEnd = (e) => {
      if (g.pinchActive) {
        g.pinchActive = false;
        return;
      }
      if (g.swiped || e.changedTouches.length === 0) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - g.touchStartX;
      const dy = t.clientY - g.touchStartY;
      // Swipe horizontal ≥ 80px dan lebih dominan daripada vertikal.
      if (Math.abs(dx) >= 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        g.swiped = true;
        if (dx < 0 && currentIndex < setlistSongs.length - 1) {
          goToSong(setlistSongs[currentIndex + 1].id); // swipe kiri → next
        } else if (dx > 0 && currentIndex > 0) {
          goToSong(setlistSongs[currentIndex - 1].id); // swipe kanan → prev
        }
      }
    };

    const handleWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setFontScale((prev) => Math.min(3, Math.max(0.85, Number(prev) + delta)));
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('wheel', handleWheel);
    };
  }, [stageMode, fontScale, currentIndex, setlistSongs]); // eslint-disable-line react-hooks/exhaustive-deps

  // =========================
  // Derived info
  // =========================
  const detectedInstruments = useMemo(
    () => extractDetectedInstrumentsFromLyrics(song?.lyrics || ''),
    [song?.lyrics],
  );
  const sections = useMemo(() => {
    const text = String(song?.lyrics || '');
    const out = [];
    text.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*\[([^\]]+)\]/);
      if (m) out.push(m[1].trim());
    });
    return out;
  }, [song?.lyrics]);

  // Hasil pencarian: setlist aktif → repertoire aplikasi → saran eksternal.
  const q = searchQuery.trim().toLowerCase();
  const searchInSetlist = setlistSongs.filter((s) => !q
    || (s.title || '').toLowerCase().includes(q)
    || (s.artist || '').toLowerCase().includes(q)
    || (s.key || '').toLowerCase().includes(q));
  const setlistIdSet = new Set(setlistSongs.map((s) => String(s.id)));
  const searchAllSongs = (Array.isArray(allSongs) ? allSongs : [])
    .filter((s) => !setlistIdSet.has(String(s.id)))
    .filter((s) => !q
      || (s.title || '').toLowerCase().includes(q)
      || (s.artist || '').toLowerCase().includes(q));
  const hasLocalResults = searchInSetlist.length > 0 || searchAllSongs.length > 0;
  const googleUrl = q ? `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}` : '';
  const youtubeSearchUrl = q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}` : '';

  if (!stageMode) return null;

  const content = (
    <div className="stage-mode-page" role="dialog" aria-modal="true" aria-label="Stage Mode">
      {/* ======== Header: keluar + judul lagu + info ======== */}
      <header className="stage-mode-header">
        <button
          type="button"
          className="btn btn-secondary stage-mode-exit"
          onClick={() => onExit?.()}
          aria-label="Keluar Stage Mode"
          title="Keluar Stage Mode (Esc)"
        >
          ✕
        </button>
        <div className="stage-mode-header-info">
          <span className="stage-mode-title">{song?.title || (dataLoading || songLoading ? 'Memuat…' : 'Belum ada lagu')}</span>
          {song?.artist && <span className="stage-mode-artist"> — {song.artist}</span>}
        </div>
        {song?.key && <span className="stage-mode-pill">{song.key}</span>}
        <span className="stage-mode-pill" title={`Tempo ${bpm} BPM`}>
          <span
            className="song-info-tempo-led"
            style={{ animationDuration: `${Math.round(60000 / bpm)}ms` }}
            aria-hidden="true"
          />
          {bpm}
        </span>
        <button
          type="button"
          className={`btn stage-mode-footer-btn${infoOpen ? ' btn-primary' : ' btn-secondary'}`}
          onClick={() => setInfoOpen((v) => !v)}
          aria-expanded={infoOpen}
          aria-label="Info lagu"
          title="Info lagu: key, tempo, genre, instrumen, struktur"
        >
          ℹ️
        </button>
      </header>

      {/* Panel info lagu (toggle) */}
      {infoOpen && song && (
        <div className="stage-mode-info" role="region" aria-label="Info lagu">
          <div className="stage-mode-info-grid">
            <div className="stage-mode-info-item"><span className="stage-mode-info-label">Judul</span><span>{song.title}</span></div>
            {song.artist && <div className="stage-mode-info-item"><span className="stage-mode-info-label">Artis</span><span>{song.artist}</span></div>}
            {song.genre && <div className="stage-mode-info-item"><span className="stage-mode-info-label">Genre</span><span>{song.genre}</span></div>}
            <div className="stage-mode-info-item"><span className="stage-mode-info-label">Key</span><span>{song.key || '—'}</span></div>
            <div className="stage-mode-info-item"><span className="stage-mode-info-label">Tempo</span><span>{bpm} BPM</span></div>
            {detectedInstruments.length > 0 && (
              <div className="stage-mode-info-item">
                <span className="stage-mode-info-label">Instrumen</span>
                <span>{detectedInstruments.join(', ')}</span>
              </div>
            )}
            {sections.length > 0 && (
              <div className="stage-mode-info-item">
                <span className="stage-mode-info-label">Struktur</span>
                <span>{sections.join(' → ')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======== Body: lirik & chord fullscreen ======== */}
      {song ? (
        <div className="stage-mode-body song-lyrics-display" ref={stageBodyRef}>
          <ChordDisplay
            song={song}
            transpose={transpose}
            fontScale={fontScale}
            currentBeat={0}
            showChords
            keySignature={song?.key || 'C'}
            isPlaying={isYoutubePlaying}
            onTimestampClick={(seconds) => {
              if (!playerVisible) setPlayerVisible(true);
              // Beri kesempatan player mount sebelum seek.
              setTimeout(() => youtubeRef.current?.handleSeek?.(seconds), playerVisible ? 0 : 600);
            }}
          />
        </div>
      ) : (
        <div className="stage-mode-body stage-mode-empty">
          {dataLoading || songLoading ? (
            <p className="stage-mode-empty-text">Memuat…</p>
          ) : (
            <>
              <p className="stage-mode-empty-text">
                {setlistSongs.length > 0
                  ? 'Pilih lagu dari setlist untuk mulai.'
                  : 'Belum ada setlist dipilih.'}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSheetOpen(setlistSongs.length > 0 ? 'song' : null)}
              >
                Pilih lagu
              </button>
            </>
          )}
        </div>
      )}

      {/* Player referensi (toggle) — untuk mendengarkan bagian tertentu */}
      {playerVisible && (
        <div className="stage-mode-player" role="region" aria-label="Player referensi">
          {youtubeId ? (
            <SongMediaPanel
              variant="card"
              youtubeId={youtubeId}
              youtubeRef={youtubeRef}
              timeMarkers={timeMarkers}
              secondsToLabel={formatDuration}
              isPlaying={isYoutubePlaying}
              onTogglePlay={() => youtubeRef.current?.handleTogglePlayPause?.()}
              onSeek={(time) => youtubeRef.current?.handleSeek?.(time)}
              onUpdateMarkers={undefined}
              currentTime={ytCurrentTime}
              duration={ytDuration}
              getCurrentYouTubeTime={() =>
                typeof youtubeRef.current?.currentTime === 'number' ? youtubeRef.current.currentTime : 0}
              onTimeUpdate={(t, d) => {
                if (typeof t === 'number' && Number.isFinite(t)) setYtCurrentTime(t);
                if (typeof d === 'number' && Number.isFinite(d)) setYtDuration(d);
              }}
              readonlyMarkers
              showMarkers
              showHeader={false}
            />
          ) : (
            <p className="stage-mode-empty-text">Lagu ini belum punya video referensi YouTube.</p>
          )}
          <button
            type="button"
            className="btn btn-secondary stage-mode-player-close"
            onClick={() => setPlayerVisible(false)}
            aria-label="Tutup player"
            title="Tutup player"
          >
            ✕
          </button>
        </div>
      )}

      {/* ======== Footer: transpose, autoscroll, player, cari, nav lagu ======== */}
      <footer className="stage-mode-footer">
        {song && (
          <TransposeKeyControl
            originalKey={song?.key || ''}
            targetKey={song?.key || ''}
            transpose={transpose}
            onTransposeChange={(next) => setTranspose(Number(next) || 0)}
            variant="mini"
            disableAutoApply
          />
        )}
        <AutoScrollControl
          autoScrollActive={autoScrollActive}
          setAutoScrollActive={setAutoScrollActive}
          scrollSpeed={scrollSpeed}
          setScrollSpeed={setScrollSpeed}
          autoScrollMode={autoScrollMode}
          setAutoScrollMode={setAutoScrollMode}
          manualSpeedLevel={manualSpeedLevel}
          setManualSpeedLevel={setManualSpeedLevel}
          tempo={bpm}
        />
        {youtubeId && (
          <button
            type="button"
            className={`btn stage-mode-footer-btn${playerVisible ? ' btn-primary' : ' btn-secondary'}`}
            onClick={() => setPlayerVisible((v) => !v)}
            aria-pressed={playerVisible}
            aria-label="Player referensi"
            title="Dengarkan lagu & loncat ke bagian tertentu (time marker)"
          >
            🎧
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary stage-mode-footer-btn"
          onClick={() => setSheetOpen('search')}
          aria-label="Cari lagu"
          title="Cari lagu di setlist / aplikasi / Google"
        >
          🔍
        </button>
        <button
          type="button"
          className="btn btn-secondary stage-mode-footer-btn"
          onClick={() => setSheetOpen('song')}
          aria-label="Daftar lagu setlist"
          title={activeSetlist ? `${activeSetlist.name} — ${currentIndex + 1}/${setlistSongs.length}` : 'Daftar lagu'}
        >
          ☰ {setlistSongs.length > 0 ? `${currentIndex + 1}/${setlistSongs.length}` : '—'}
        </button>
        <button
          type="button"
          className="btn btn-secondary stage-mode-footer-btn"
          onClick={() => currentIndex > 0 && goToSong(setlistSongs[currentIndex - 1].id)}
          disabled={currentIndex <= 0}
          aria-label="Lagu sebelumnya"
          title={currentIndex > 0 ? (setlistSongs[currentIndex - 1].title || 'Lagu sebelumnya') : 'Tidak ada lagu sebelumnya'}
        >
          ←
        </button>
        <button
          type="button"
          className="btn btn-primary stage-mode-next"
          onClick={() => currentIndex < setlistSongs.length - 1 && goToSong(setlistSongs[currentIndex + 1].id)}
          disabled={currentIndex < 0 || currentIndex >= setlistSongs.length - 1}
          aria-label="Lagu berikutnya"
          title={currentIndex < setlistSongs.length - 1 ? (setlistSongs[currentIndex + 1].title || 'Lagu berikutnya') : 'Lagu terakhir'}
        >
          →
        </button>
      </footer>

      {/* ======== Wizard setup berurutan (pertama kali saja) ======== */}
      {setupStep && (
        <div
          className="stage-mode-sheet-overlay stage-mode-wizard-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Pilih band dan setlist untuk panggung"
        >
          <div
            className="stage-mode-sheet stage-mode-sheet--tall"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="stage-mode-wizard-header">
              <div className="stage-mode-wizard-progress" aria-label="Langkah setup">
                <span className={`stage-mode-wizard-dot${setupStep === 'band' ? ' active' : ' done'}`} aria-hidden="true">{setupStep === 'band' ? '1' : '✓'}</span>
                <span className="stage-mode-wizard-bar" aria-hidden="true" />
                <span className={`stage-mode-wizard-dot${setupStep === 'setlist' ? ' active' : ''}`} aria-hidden="true">2</span>
              </div>
              <div className="stage-mode-sheet-title">
                {setupStep === 'band' ? 'Pilih band yang manggung' : 'Pilih setlist untuk panggung'}
              </div>
              <p className="stage-mode-wizard-subtitle">
                {setupStep === 'band'
                  ? 'Setlist akan difilter sesuai band yang dipilih.'
                  : activeSetlist
                    ? `Setlist: ${activeSetlist.name}`
                    : 'Urutan lagu di setlist dipakai sebagai urutan panggung.'}
              </p>
            </div>

            {setupStep === 'band' && (
              <div className="stage-mode-sheet-list" role="menu">
                {bands.length === 0 && !dataLoading && (
                  <div className="stage-mode-sheet-empty">Tidak ada band. Lewati ke pemilihan setlist.</div>
                )}
                {bands.map((b) => {
                  const id = String(b.bandId || b.id);
                  return (
                    <button
                      key={id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={id === String(bandId)}
                      className={`stage-mode-sheet-item${id === String(bandId) ? ' active' : ''}`}
                      onClick={() => handleSelectBand(id)}
                    >
                      <span className="stage-mode-sheet-name">{b.name || b.bandName || 'Band'}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {setupStep === 'setlist' && (
              <div className="stage-mode-sheet-list" role="menu">
                {filteredSetlists.map((sl) => (
                  <button
                    key={sl.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={String(sl.id) === String(setlistId)}
                    className={`stage-mode-sheet-item${String(sl.id) === String(setlistId) ? ' active' : ''}`}
                    onClick={() => handleSelectSetlist(String(sl.id))}
                  >
                    <span className="stage-mode-sheet-name">{sl.name || 'Tanpa nama'}</span>
                    {Array.isArray(sl.songs) && sl.songs.length > 0 && (
                      <span className="stage-mode-pill">{sl.songs.length} lagu</span>
                    )}
                  </button>
                ))}
                {filteredSetlists.length === 0 && (
                  <div className="stage-mode-sheet-empty">
                    Tidak ada setlist untuk band ini.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======== Sheets ======== */}
      {sheetOpen && (
        <div
          className="stage-mode-sheet-overlay"
          onClick={() => setSheetOpen(null)}
          role="presentation"
        >
          <div
            className="stage-mode-sheet"
            role="menu"
            aria-label="Pilih"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Daftar lagu setlist */}
            {sheetOpen === 'song' && (
              <>
                <div className="stage-mode-sheet-title">
                  {activeSetlist?.name || 'Daftar lagu'} — {setlistSongs.length} lagu
                </div>
                <div className="stage-mode-sheet-list" role="menu">
                  {setlistSongs.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={i === currentIndex}
                      onClick={() => goToSong(s.id)}
                      className={`stage-mode-sheet-item${i === currentIndex ? ' active' : ''}`}
                    >
                      <span className="stage-mode-sheet-number">{i + 1}</span>
                      <span className="stage-mode-sheet-name">
                        {s.title || 'Tanpa judul'}
                        {s.artist && <span className="stage-mode-sheet-artist"> — {s.artist}</span>}
                      </span>
                      {s.key && <span className="stage-mode-pill">{s.key}</span>}
                    </button>
                  ))}
                  {setlistSongs.length === 0 && (
                    <div className="stage-mode-sheet-empty">Setlist ini masih kosong.</div>
                  )}
                </div>
              </>
            )}

            {/* Pencarian: setlist → aplikasi → Google/YouTube */}
            {sheetOpen === 'search' && (
              <>
                <div className="stage-mode-sheet-title">Cari lagu</div>
                <div className="stage-mode-sheet-search">
                  <input
                    type="search"
                    className="stage-mode-sheet-search-input"
                    placeholder="Judul, artis, atau key…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Cari lagu"
                    autoFocus
                  />
                </div>
                <div className="stage-mode-sheet-list" role="menu">
                  {searchInSetlist.length > 0 && (
                    <div className="stage-mode-sheet-group-label">Dalam setlist</div>
                  )}
                  {searchInSetlist.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={String(s.id) === String(effectiveSongId)}
                      onClick={() => goToSong(s.id)}
                      className={`stage-mode-sheet-item${String(s.id) === String(effectiveSongId) ? ' active' : ''}`}
                    >
                      <span className="stage-mode-sheet-name">
                        {s.title || 'Tanpa judul'}
                        {s.artist && <span className="stage-mode-sheet-artist"> — {s.artist}</span>}
                      </span>
                      {s.key && <span className="stage-mode-pill">{s.key}</span>}
                    </button>
                  ))}
                  {searchAllSongs.length > 0 && (
                    <div className="stage-mode-sheet-group-label">Repertoire aplikasi</div>
                  )}
                  {searchAllSongs.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="menuitemradio"
                      onClick={() => goToSong(s.id)}
                      className="stage-mode-sheet-item"
                    >
                      <span className="stage-mode-sheet-name">
                        {s.title || 'Tanpa judul'}
                        {s.artist && <span className="stage-mode-sheet-artist"> — {s.artist}</span>}
                      </span>
                      {s.key && <span className="stage-mode-pill">{s.key}</span>}
                    </button>
                  ))}
                  {q && (
                    <>
                      <div className="stage-mode-sheet-group-label">Di luar aplikasi</div>
                      <a
                        className="stage-mode-sheet-item stage-mode-sheet-link"
                        href={googleUrl}
                        target="_blank"
                        rel="noreferrer"
                        role="menuitem"
                      >
                        <span className="stage-mode-sheet-name">🌐 Cari “{searchQuery}” di Google</span>
                      </a>
                      <a
                        className="stage-mode-sheet-item stage-mode-sheet-link"
                        href={youtubeSearchUrl}
                        target="_blank"
                        rel="noreferrer"
                        role="menuitem"
                      >
                        <span className="stage-mode-sheet-name">▶ Cari “{searchQuery}” di YouTube</span>
                      </a>
                    </>
                  )}
                  {!hasLocalResults && !q && (
                    <div className="stage-mode-sheet-empty">Ketik untuk mencari lagu…</div>
                  )}
                  {!hasLocalResults && q && (
                    <div className="stage-mode-sheet-empty">Tidak ada di aplikasi — coba cari di Google/YouTube.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}
