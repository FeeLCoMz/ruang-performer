import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ChordDisplay, { normalizeChordStyle } from '../../components/ChordDisplay.jsx';
import AutoScrollControl from '../../components/AutoScrollControl.jsx';
import { CHORD_STYLE_EVENT, getStoredChordStyle } from '../../utils/chordStyleStore.js';
import TransposeKeyControl from '../../components/TransposeKeyControl.jsx';
import SongMediaPanel from '../../components/SongMediaPanel.jsx';
import { useSongFetch } from '../../hooks/useSongFetch.js';
import { useStageModeEnabled } from './useStageModeEnabled.js';
import * as apiClient from '../../apiClient.js';
import { STORAGE_KEYS } from '../../utils/storageKeys.js';
import { getTransposeSteps, extractDetectedInstrumentsFromLyrics } from '../../utils/chordUtils.js';
import './stage-mode.css';
import {
  AUTO_SCROLL_MODES,
  computeManualScrollSpeed,
  computeMusicalScrollSpeed,
  estimateBarCount,
  estimateChordCount,
  normalizeAutoScrollMode,
  parseTimeSignatureNumerator,
} from '../../utils/autoscrollSpeedUtils.js';

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
export default function StageModePage({
  stageMode,
  onExit,
  songs: songsProp = [],
  bands: bandsProp = [],
  setlists: setlistsProp = [],
  activeSetlist: initialSetlist = null,
}) {
  // Modul Stage Mode bisa dimatikan dari halaman Modul. Halaman tetap bisa
  // dibuka, tetapi tidak memasang scroll-lock, autoscroll, atau fetch data.
  const [moduleEnabled] = useStageModeEnabled();

  // =========================
  // Data band & setlist
  // =========================
  const [bands, setBands] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [bandId, setBandId] = useState(() => readStored(STORAGE_KEYS.STAGE_BAND));
  const [setlistId, setSetlistId] = useState(() => readStored(STORAGE_KEYS.STAGE_SETLIST));
  const [selectedSongId, setSelectedSongId] = useState(() => readStored(STORAGE_KEYS.STAGE_SONG));
  const [dataLoading, setDataLoading] = useState(true);
  // Pesan error bila fetch data Stage Mode gagal (dengan tombol coba lagi).
  const [dataError, setDataError] = useState('');
  // Nonce untuk memicu ulang fetch data (tombol "Coba lagi").
  const [dataReloadNonce, setDataReloadNonce] = useState(0);
  const [allSongs, setAllSongs] = useState(Array.isArray(songsProp) ? songsProp : []);

  // Sinkronkan data yang sudah di-fetch aplikasi mode normal (props dari App):
  // songs, bands, dan setlists dipakai apa adanya bila tersedia, sehingga
  // Stage Mode tidak perlu fetch ulang.
  useEffect(() => {
    if (Array.isArray(bandsProp) && bandsProp.length > 0) setBands(bandsProp);
  }, [bandsProp]);
  useEffect(() => {
    if (Array.isArray(setlistsProp) && setlistsProp.length > 0) setSetlists(setlistsProp);
  }, [setlistsProp]);
  // Songs juga harus terus tersinkron: props dari App bisa tiba SETELAH
  // Stage Mode terpasang (mis. fetch App selesai belakangan, atau user
  // menambah/menghapus lagu), dan fetch internal bisa saja gagal. Tanpa
  // sinkron ini, `allSongs` bisa tetap kosong dan pencarian "tidak ada lagu".
  useEffect(() => {
    if (!Array.isArray(songsProp) || songsProp.length === 0) return;
    setAllSongs((prev) => {
      // Ambil versi props bila sebelumnya kosong, atau daftar id berbeda
      // (data berubah di aplikasi) — hindari re-render saat sama saja.
      if (prev.length === 0 || prev.length !== songsProp.length) return songsProp;
      const prevIds = new Set(prev.map((s) => String(s.id)));
      return songsProp.every((s) => prevIds.has(String(s.id))) ? prev : songsProp;
    });
  }, [songsProp]);

  // Hanya fetch data yang BELUM di-fetch oleh aplikasi (props kosong).
  useEffect(() => {
    if (!stageMode || !moduleEnabled) return undefined;
    const needsSongs = !Array.isArray(songsProp) || songsProp.length === 0;
    const needsBands = !Array.isArray(bandsProp) || bandsProp.length === 0;
    const needsSetlists = !Array.isArray(setlistsProp) || setlistsProp.length === 0;
    if (!needsSongs && !needsBands && !needsSetlists) {
      setDataLoading(false);
      return undefined;
    }
    let cancelled = false;
    setDataLoading(true);
    setDataError('');
    // Fetch selektif: hanya request yang benar-benar dibutuhkan.
    Promise.allSettled([
      needsBands ? apiClient.fetchBands() : Promise.resolve(undefined),
      needsSetlists ? apiClient.fetchSetLists() : Promise.resolve(undefined),
      needsSongs ? apiClient.fetchSongs() : Promise.resolve(undefined),
    ])
      .then(([bandsRes, setlistsRes, songsRes]) => {
        if (cancelled) return;
        if (Array.isArray(bandsRes.value) && bandsRes.value.length > 0) {
          setBands(bandsRes.value);
        }
        if (Array.isArray(setlistsRes.value) && setlistsRes.value.length > 0) {
          setSetlists(setlistsRes.value);
        }
        if (Array.isArray(songsRes.value) && songsRes.value.length > 0) {
          setAllSongs(songsRes.value);
        }
        // Request yang gagal dilaporkan: request masih bisa sukses (fulfilled)
        // dengan nilai undefined bila props sudah menyediakan datanya.
        const failed = [bandsRes, setlistsRes, songsRes]
          .some((r) => r.status === 'rejected');
        if (failed) setDataError('Gagal memuat data. Periksa koneksi, lalu coba lagi.');
        setDataLoading(false);
      });
    return () => { cancelled = true; };
    // songsProp/bandsProp/setlistsProp sengaja tidak di dep — penilaian
    // "data tersedia" cukup dilakukan saat Stage Mode dinyalakan (dan lewat
    // effect sinkron di atas). dataReloadNonce dipakai tombol "Coba lagi".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageMode, dataReloadNonce]);

  // =========================
  // Setlist aktif
  // =========================
  // Setlist aktif = setlist yang sedang dibuka di mode normal (initialSetlist
  // dari App). Jika Stage Mode diaktifkan di luar halaman setlist, pakai
  // preferensi tersimpan. Lagu aktif tetap dari preferensi tersimpan.
  // Menandai bahwa user sudah memilih setlist sendiri di dalam Stage Mode.
  // Setelah itu, initialSetlist dari App (setlist yang terbuka di mode normal)
  // tidak boleh menimpa pilihan user lagi — kalau tidak, setlist yang baru
  // dipilih langsung "kembali" ke setlist halaman semula.
  const setlistOverriddenRef = useRef(false);
  useEffect(() => {
    if (!stageMode || !initialSetlist?.id) return;
    if (setlistOverriddenRef.current) return;
    if (String(setlistId) !== String(initialSetlist.id)) {
      setSetlistId(String(initialSetlist.id));
      writeStored(STORAGE_KEYS.STAGE_SETLIST, String(initialSetlist.id));
    }
  }, [stageMode, initialSetlist?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Setlist aktif: prioritas dari halaman setlist (initialSetlist), lalu
  // dari daftar setlists. Bila hanya punya ID (dari preferensi tersimpan
  // atau ringkasan tanpa daftar lagu), fetch detailnya via fetchSetListById
  // (cache offline + auth header) supaya urutan lagu tersedia.
  const [resolvedSetlist, setResolvedSetlist] = useState(null);
  // Menandai setlist detail sedang dimuat (fetchSetListById berjalan).
  const [setlistDetailLoading, setSetlistDetailLoading] = useState(false);
  // Pesan kegagalan fetch detail setlist — ditampilkan di sheet dengan tombol coba lagi.
  const [setlistDetailError, setSetlistDetailError] = useState('');
  // Counter untuk memicu ulang fetch detail (tombol "Coba lagi").
  const [setlistDetailRetry, setSetlistDetailRetry] = useState(0);
  // Menunda pembukaan sheet daftar lagu sampai detail setlist (urutan lagu)
  // tersedia — dipicu oleh handleSelectSetlist.
  const pendingSongSheetRef = useRef(false);
  const activeSetlistCandidate = useMemo(() => {
    // Pilihan user di Stage Mode menang: bila sudah override, initialSetlist
    // (setlist halaman mode normal) tidak dipakai lagi.
    if (!setlistOverriddenRef.current && initialSetlist?.id) return initialSetlist;
    return setlists.find((sl) => String(sl.id) === String(setlistId)) || null;
  }, [initialSetlist, setlists, setlistId]);
  const activeSetlistNeedsDetail = useMemo(() => {
    if (!activeSetlistCandidate) return false;
    // Sudah cukup bila daftar lagunya tersedia.
    return !Array.isArray(activeSetlistCandidate.songs);
  }, [activeSetlistCandidate]);
  useEffect(() => {
    setResolvedSetlist(null);
  }, [activeSetlistCandidate?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!stageMode || !activeSetlistNeedsDetail || !activeSetlistCandidate?.id) return undefined;
    let cancelled = false;
    setSetlistDetailLoading(true);
    setSetlistDetailError('');
    apiClient.fetchSetListById(activeSetlistCandidate.id)
      .then((detail) => {
        if (cancelled) return;
        if (detail) setResolvedSetlist(detail);
        setSetlistDetailLoading(false);
        // Saat pemilihan setlist menunggu detail, buka sheet lagu hanya
        // setelah data lagu setlist benar-benar tersedia.
        if (pendingSongSheetRef.current) {
          pendingSongSheetRef.current = false;
          setSheetOpen('song');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        // Gagal memuat: tutup loading, jangan buka sheet lagu otomatis,
        // dan tampilkan pesan error + tombol coba lagi di sheet.
        pendingSongSheetRef.current = false;
        setSetlistDetailLoading(false);
        setSetlistDetailError(err?.message || 'Gagal memuat lagu setlist. Periksa koneksi dan coba lagi.');
      });
    return () => { cancelled = true; };
  }, [stageMode, activeSetlistNeedsDetail, activeSetlistCandidate?.id, setlistDetailRetry]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeSetlist = useMemo(() => {
    if (activeSetlistCandidate && (!activeSetlistNeedsDetail || Array.isArray(activeSetlistCandidate.songs))) {
      return activeSetlistCandidate;
    }
    return resolvedSetlist || null;
  }, [activeSetlistCandidate, activeSetlistNeedsDetail, resolvedSetlist]);

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
  };

  const handleSelectSetlist = (nextSetlistId) => {
    setlistOverriddenRef.current = true;
    setSetlistId(nextSetlistId);
    writeStored(STORAGE_KEYS.STAGE_SETLIST, nextSetlistId);
    setSelectedSongId('');
    writeStored(STORAGE_KEYS.STAGE_SONG, '');
    // Detail lagu setlist (urutan + data lagu) harus tersedia dulu. Bila
    // detailnya belum ada, tunda pembukaan sheet lagu sampai fetch selesai
    // dan tampilkan indikator loading.
    const candidate = setlists.find((sl) => String(sl.id) === String(nextSetlistId)) || null;
    if (candidate && !Array.isArray(candidate.songs)) {
      pendingSongSheetRef.current = true;
      setSetlistDetailLoading(true);
      return;
    }
    setSheetOpen('song');
  };

  // =========================
  // Lagu aktif
  // =========================
  // Lagu dari setlist (urutan panggung) dengan meta key/tempo override.
  // Field meta bisa bernama setlistSongMeta (daftar) atau songKeys (detail
  // endpoint /:id) — baca keduanya agar override key selalu terkirim ke
  // Stage Mode, sama seperti SongChordsPage.
  const setlistSongMeta = useMemo(() => {
    const raw = activeSetlist?.setlistSongMeta && typeof activeSetlist.setlistSongMeta === 'object'
      ? activeSetlist.setlistSongMeta
      : (activeSetlist?.songKeys && typeof activeSetlist.songKeys === 'object' ? activeSetlist.songKeys : null);
    return (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
  }, [activeSetlist?.setlistSongMeta, activeSetlist?.songKeys]);
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

  const effectiveSongId = selectedSongId || setlistSongs[0]?.id || null;

  // Index lagu aktif dihitung dari effectiveSongId (bukan selectedSongId)
  // agar footer ✓ posisi & tombol ← / → akurat juga saat lagu pertama
  // dipilih otomatis (selectedSongId masih kosong).
  const currentIndex = setlistSongs.findIndex((s) => String(s.id) === String(effectiveSongId));

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

  const hasSong = Boolean(song);

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
  // Bila user sudah mengubah transpose manual untuk lagu ini, auto-apply
  // transpose dari setlist tidak boleh menimpanya. Flag direset saat pindah lagu.
  const userAdjustedTransposeRef = useRef(false);
  // Gaya chord mengikuti preferensi panel lirik (SongChordsPage).
  const [chordStyle, setChordStyle] = useState(() => getStoredChordStyle(normalizeChordStyle));
  useEffect(() => {
    const sync = (event) => setChordStyle(normalizeChordStyle(event?.detail));
    window.addEventListener(CHORD_STYLE_EVENT, sync);
    return () => window.removeEventListener(CHORD_STYLE_EVENT, sync);
  }, []);
  const [fontScale, setFontScale] = useState(() => {
    const stored = Number(readStored(STORAGE_KEYS.STAGE_FONT_SCALE));
    return Number.isFinite(stored) && stored >= 0.85 && stored <= 3 ? stored : 1.2;
  });
  const [autoScrollMode, setAutoScrollMode] = useState(() => {
    const stored = readStored(STORAGE_KEYS.STAGE_AUTOSCROLL_MODE);
    return stored === AUTO_SCROLL_MODES.MANUAL || stored === AUTO_SCROLL_MODES.MUSICAL
      ? stored
      : AUTO_SCROLL_MODES.MUSICAL;
  });
  // Persist preferensi lirik lintas sesi (font zoom & mode autoscroll).
  useEffect(() => {
    writeStored(STORAGE_KEYS.STAGE_FONT_SCALE, String(fontScale));
  }, [fontScale]);
  // fontScale diterapkan sebagai CSS var pada container lirik — .cd memakai
  // font-size skala ini (pola sama dengan SongChordsLyricsDisplay).
  useEffect(() => {
    const el = stageBodyRef.current;
    if (!el) return;
    el.style.setProperty('--lyrics-font-scale', String(Number(fontScale) || 1));
  }, [fontScale, hasSong]);
  useEffect(() => {
    writeStored(STORAGE_KEYS.STAGE_AUTOSCROLL_MODE, autoScrollMode);
  }, [autoScrollMode]);
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  // scrollSpeed = BPM efektif untuk autoscroll MUSICAL (tombol −/+ di
  // AutoScrollControl mengubahnya, sama seperti mode normal) dan juga
  // display metronome/tempo. Mode MANUAL memakai manualSpeedLevel.
  const [scrollSpeed, setScrollSpeed] = useState(120);
  const [manualSpeedLevel, setManualSpeedLevel] = useState(5);
  const [sheetOpen, setSheetOpen] = useState(null); // null | 'song' | 'setlist' | 'search'
  // Query pencarian direset saat sheet ditutup agar sheet berikutnya tidak
  // menyimpan filter lama yang tersembunyi dari pandangan user.
  useEffect(() => {
    if (sheetOpen === null) {
      setSearchQuery('');
      setSetlistSearchQuery('');
    }
  }, [sheetOpen]);
  const [searchQuery, setSearchQuery] = useState('');
  const [setlistSearchQuery, setSetlistSearchQuery] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(false);

  // Reset kontrol performance saat pindah lagu.
  useEffect(() => {
    setTranspose(0);
    userAdjustedTransposeRef.current = false;
    setAutoScrollActive(false);
    setScrollSpeed(Number(song?.tempo) || 120);
    setPlayerVisible(false);
    // Lirik kembali ke awal: scroll container lirik ke atas. Dijalankan
    // juga saat song id berubah dari/ke null (empty-state) — container
    // mungkin belum terpasang, maka dicek dulu.
    const el = stageBodyRef.current;
    if (el) el.scrollTop = 0;
  }, [effectiveSongId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset state player YouTube saat pindah lagu — progress/durasi/status
  // play jangan membawa data lagu sebelumnya sampai event baru masuk.
  useEffect(() => {
    setYtCurrentTime(0);
    setYtDuration(0);
    setIsYoutubePlaying(false);
  }, [effectiveSongId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sinkronkan dataLoading bila props dari App baru tersedia setelah fetch
  // lokal dimulai — jangan biarkan loading menggantung dan fetch ulang data
  // yang sebenarnya sudah ada dari mode normal.
  useEffect(() => {
    const allFromProps = Array.isArray(songsProp) && songsProp.length > 0
      && Array.isArray(bandsProp) && bandsProp.length > 0
      && Array.isArray(setlistsProp) && setlistsProp.length > 0;
    if (allFromProps && dataLoading) setDataLoading(false);
  }, [songsProp, bandsProp, setlistsProp, dataLoading]);

  // (Wizard setup dihapus — pemilihan band & setlist dilakukan lewat sheet
  //  dropdown di footer/sheet pemilih setlist.)
  // BPM lagu aktif — dipakai autoscroll (MUSICAL), LED header, dan kontrol.
  const bpm = Math.max(40, Math.min(240, Number(song?.tempo) || 120));

  // Normalisasi mode autoscroll (MUSICAL/MANUAL).
  const normalizedAutoScrollMode = normalizeAutoScrollMode(autoScrollMode);

  // Autoscroll: digerakkan di sini (container .stage-mode-body). Kecepatan
  // dihitung dengan utilitas resmi aplikasi (autoscrollSpeedUtils) supaya
  // perilakunya identik dengan panel lirik biasa:
  // - MUSICAL: V = tinggi baris / durasi musik baris, diukur PER BARIS (baris
  //   pertama yang masuk viewport) dengan barCount/chordCount dari teks
  //   baris chord — sama seperti SongChordsLyricsDisplay.
  // - MANUAL : multiplier × level^1.55 (level 1 = sangat lambat).
  // hasSong di dep: container body baru ada setelah lagu termuat — jangan
  // pasang loop autoscroll pada elemen empty-state.
  useEffect(() => {
    const container = stageBodyRef.current;
    if (!stageMode || !autoScrollActive || !hasSong || !container) return undefined;

    let rafId = null;
    let lastTs = null;
    let accumulator = 0;

    // Metrik baris untuk mode MUSICAL — identik dengan panel lirik normal:
    // baris yang diukur adalah baris pertama (.cd-chord/.cd-number) yang
    // masih berada di viewport, sehingga kecepatan mengikuti bar yang
    // sedang dinyanyikan, bukan rata-rata seluruh lagu.
    const measureLineMetrics = () => {
      const lineEls = Array.from(container.querySelectorAll('.cd-chord, .cd-number, .cd-lyrics-line'));
      if (lineEls.length === 0) {
        return { lineHeightsPx: 24, barCount: 0, chordCount: 0, text: '' };
      }
      const containerTop = container.getBoundingClientRect().top;
      const firstEl = lineEls.find((el) => {
        const rect = el.getBoundingClientRect();
        return rect.bottom > containerTop;
      }) || lineEls[0];
      const style = window.getComputedStyle(firstEl);
      const lineHeight = parseFloat(style.lineHeight)
        || parseFloat(style.fontSize) * 1.6
        || firstEl.getBoundingClientRect().height
        || 24;

      // Tinggi blok per baris: jarak baris chord ini ke baris chord
      // berikutnya (mencakup chord + baris liriknya) — sama seperti panel
      // lirik normal.
      let blockHeight = Math.max(8, Math.round(lineHeight));
      const nextEl = lineEls[lineEls.indexOf(firstEl) + 1];
      if (nextEl) {
        const distance = Math.round(nextEl.getBoundingClientRect().top - firstEl.getBoundingClientRect().top);
        if (Number.isFinite(distance) && distance > blockHeight) {
          blockHeight = distance;
        }
      }

      const text = firstEl.textContent || '';
      return {
        lineHeightsPx: blockHeight,
        barCount: estimateBarCount(text),
        chordCount: estimateChordCount(text),
        text,
      };
    };

    const computePixelsPerSecond = () => {
      if (normalizedAutoScrollMode === AUTO_SCROLL_MODES.MANUAL) {
        return computeManualScrollSpeed({ userSpeedLevel: manualSpeedLevel });
      }
      // MUSICAL: per baris, dari BPM efektif (scrollSpeed — tombol −/+
      // di AutoScrollControl mengubah nilai ini, sama seperti mode normal)
      // + time signature lagu.
      const metrics = measureLineMetrics();
      return computeMusicalScrollSpeed({
        lineHeightsPx: metrics.lineHeightsPx,
        barCount: metrics.barCount,
        chordCount: metrics.chordCount,
        bpm: scrollSpeed,
        timeSignatureNumerator: parseTimeSignatureNumerator(song?.time_signature || '4/4'),
        beatsPerChord: parseTimeSignatureNumerator(song?.time_signature || '4/4'),
      });
    };

    let cachedSpeed = computePixelsPerSecond();
    let lastMeasure = 0;
    const speedPxPerSecond = (ts) => {
      // Kecepatan di-cache dan diukur ulang tiap ~500ms (baris aktif bisa
      // pindah, zoom/font bisa berubah) — querySelectorAll +
      // getBoundingClientRect terlalu mahal untuk per frame.
      if (ts - lastMeasure >= 500) {
        lastMeasure = ts;
        cachedSpeed = computePixelsPerSecond();
      }
      return cachedSpeed;
    };

    const step = (ts) => {
      // Berhenti otomatis di akhir lirik — cek juga sebelum menambah
      // accumulator, agar loop tidak berjalan tanpa hasil bila posisi
      // scroll sudah ada di bawah saat autoscroll dinyalakan.
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 2) {
        setAutoScrollActive(false);
        return;
      }
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(100, ts - lastTs);
      lastTs = ts;
      accumulator += (speedPxPerSecond(ts) * dt) / 1000;
      if (accumulator >= 1) {
        const px = Math.floor(accumulator);
        accumulator -= px;
        container.scrollTop += px;
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [stageMode, autoScrollActive, hasSong, normalizedAutoScrollMode, manualSpeedLevel, scrollSpeed, song?.id, song?.time_signature]);

  // Key master lagu (tanpa override setlist) — pembanding untuk auto-apply
  // transpose. song.key sudah berisi override setlist, jadi bukan pembanding
  // yang benar.
  const masterKey = useMemo(() => {
    if (!song?.id) return '';
    const base = allSongs.find((s) => String(s.id) === String(song.id));
    return base?.key || song.key || '';
  }, [song?.id, song?.key, allSongs]);

  // Auto-apply transpose bila key setlist berbeda dari key lagu master.
  // Dilewati bila user sudah mengubah transpose manual untuk lagu ini.
  useEffect(() => {
    const setlistKey = setlistSongMeta[String(song?.id)]?.key || '';
    if (userAdjustedTransposeRef.current) return;
    if (!masterKey || !setlistKey || masterKey === setlistKey) return;
    const steps = getTransposeSteps(masterKey, setlistKey);
    if (steps !== null) setTranspose(steps);
  }, [song?.id, masterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const youtubeRef = useRef(null);
  const stageBodyRef = useRef(null);
  const [isYoutubePlaying, setIsYoutubePlaying] = useState(false);
  const [ytCurrentTime, setYtCurrentTime] = useState(0);
  const [ytDuration, setYtDuration] = useState(0);
  const timeMarkers = Array.isArray(song?.time_markers) ? song.time_markers : [];

  // Poll status playback video (sejajar SongChordsPage) + update langsung
  // dari event player (onStateChange) agar responsif — polling tetap sebagai
  // fallback, dan durasi diisi dari event getDuration.
  const youtubeId = extractYouTubeId(song?.youtubeId || song?.youtube_url || '');
  const handleYouTubeStateChange = (event) => {
    const state = event?.data;
    if (state === 1) {
      setIsYoutubePlaying(true);
    } else if (state === 0 || state === 2) {
      setIsYoutubePlaying(false);
      if (state === 0) setYtCurrentTime(0);
    }
    try {
      const d = Number(event?.target?.getDuration?.());
      if (Number.isFinite(d) && d > 0) setYtDuration(d);
    } catch { /* ignore */ }
  };
  useEffect(() => {
    if (!youtubeId || !playerVisible) {
      setIsYoutubePlaying(false);
      return undefined;
    }
    const intervalId = setInterval(() => {
      const player = youtubeRef.current;
      if (!player || typeof player.getPlayerState !== 'function') return;
      setIsYoutubePlaying(player.getPlayerState() === 1);
      // Fallback durasi: isi bila event onStateChange belum mengirimkannya
      // (panel belum memutar video). Pertahankan nilai yang sudah ada.
      setYtDuration((prev) => {
        if (prev) return prev;
        try {
          const d = Number(player.getDuration?.());
          return Number.isFinite(d) && d > 0 ? d : prev;
        } catch { return prev; }
      });
    }, 500);
    return () => clearInterval(intervalId);
  }, [youtubeId, playerVisible]);

  // Esc: tutup sheet dulu (jika terbuka), baru keluar Stage Mode.
  useEffect(() => {
    if (!stageMode || !moduleEnabled) return undefined;
    const handleKey = (e) => {
      if (e.key !== 'Escape') return;
      if (sheetOpen) {
        e.preventDefault();
        setSheetOpen(null);
        return;
      }
      if (infoOpen) {
        e.preventDefault();
        setInfoOpen(false);
        return;
      }
      if (playerVisible) {
        e.preventDefault();
        setPlayerVisible(false);
        return;
      }
      onExit?.();
    };
    window.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [stageMode, moduleEnabled, sheetOpen, infoOpen, playerVisible, onExit]);

  // ======== Gestur panggung ========
  // - Pinch (2 jari): perbesar/perkecil font lirik (fontScale).
  // - Wheel + Ctrl : perbesar/perkecil font lirik (desktop).
  // (Swipe antar lagu dihapus — sering terpicu tidak sengaja. Pindah lagu
  // tetap lewat tombol footer ← / →.)
  const gestureRef = useRef({ pinchActive: false, startDistance: 0, startFontScale: 1.2 });
  // Ref ke fontScale terbaru — effect gesture tidak perlu re-subscribe listener
  // setiap kali fontScale berubah (setiap tick pinch).
  const fontScaleRef = useRef(fontScale);
  useEffect(() => { fontScaleRef.current = fontScale; }, [fontScale]);

  useEffect(() => {
    const el = stageBodyRef.current;
    // Hanya pasang pada container lirik yang sudah termuat (bukan empty-state).
    if (!stageMode || !hasSong || !el) return undefined;
    const g = gestureRef.current;

    const getDistance = (touches) => Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    );

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        g.pinchActive = true;
        g.startDistance = getDistance(e.touches);
        g.startFontScale = Number(fontScaleRef.current) || 1.2;
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

    const handleTouchEnd = () => {
      if (g.pinchActive) g.pinchActive = false;
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
  }, [stageMode, hasSong]);

  // ======== Sheet: focus trap + navigasi keyboard ========
  // Fokus dipindah ke elemen pertama sheet saat dibuka, Tab dikunci dalam
  // sheet, Arrow ↑/↓ berpindah antar item daftar, dan fokus dikembalikan ke
  // elemen pemicu saat sheet ditutup.
  const sheetRef = useRef(null);
  const lastFocusedRef = useRef(null);
  useEffect(() => {
    if (!sheetOpen) return undefined;
    lastFocusedRef.current = document.activeElement;
    const getFocusables = () => Array.from(
      sheetRef.current?.querySelectorAll('button, input, a[href]') || [],
    ).filter((el) => !el.disabled && el.offsetParent !== null);
    const focusTimer = setTimeout(() => getFocusables()[0]?.focus(), 0);
    const handleKey = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = Array.from(
          sheetRef.current?.querySelectorAll('.stage-mode-sheet-item') || [],
        ).filter((el) => !el.disabled);
        if (items.length === 0) return;
        e.preventDefault();
        const idx = items.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown'
          ? (idx + 1) % items.length
          : (idx - 1 + items.length) % items.length;
        items[next]?.focus();
      } else if (e.key === 'Tab') {
        const els = getFocusables();
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKey);
      // Kembalikan fokus ke pemicu (tombol footer) agar operasi keyboard
      // berlanjut mulus setelah sheet ditutup.
      lastFocusedRef.current?.focus?.();
    };
  }, [sheetOpen]);

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

  // Modul dimatikan: jangan pasang tampilan panggung sama sekali (termasuk
  // scroll-lock body dan pintasan keyboard) — cukup beri jalan keluar.
  if (!moduleEnabled) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>🎤 Stage Mode</h1>
        </div>
        <div className="ct-banner ct-banner-warn" role="status">
          Modul Stage Mode sedang dinonaktifkan.
        </div>
        <button type="button" className="btn btn-primary" onClick={() => onExit?.()}>
          Keluar
        </button>
      </div>
    );
  }

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
            chordStyle={chordStyle}
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
              onStateChange={handleYouTubeStateChange}
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
            // originalKey harus key MASTER lagu (tanpa override setlist).
            // song.key sudah berisi override key setlist, sehingga kalau dipakai
            // sebagai acuan, tombol ± menampilkan "D → D" (override dianggap
            // key asli) dan reset mengembalikan ke key setlist, bukan key master.
            originalKey={masterKey || song?.key || ''}
            targetKey={song?.key || ''}
            transpose={transpose}
            onTransposeChange={(next) => {
              // User mengubah manual — hentikan auto-apply dari setlist
              // untuk lagu ini sampai pindah lagu berikutnya.
              userAdjustedTransposeRef.current = true;
              setTranspose(Number(next) || 0);
            }}
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
          title={activeSetlist ? `${activeSetlist.name} — ${currentIndex >= 0 ? currentIndex + 1 : 'luar setlist'}/${setlistSongs.length}` : 'Daftar lagu'}
        >
          ☰ {setlistSongs.length > 0 ? `${currentIndex >= 0 ? currentIndex + 1 : '—'}/${setlistSongs.length}` : '—'}
        </button>
        <button
          type="button"
          className="btn btn-secondary stage-mode-footer-btn stage-mode-nav-btn"
          onClick={() => currentIndex >= 0 && goToSong(setlistSongs[currentIndex - 1].id)}
          disabled={currentIndex <= 0}
          aria-label="Lagu sebelumnya"
          title={currentIndex > 0 ? (setlistSongs[currentIndex - 1].title || 'Lagu sebelumnya') : (currentIndex < 0 ? 'Lagu di luar setlist — navigasi tidak tersedia' : 'Tidak ada lagu sebelumnya')}
        >
          ←
        </button>
        <button
          type="button"
          className="btn btn-primary stage-mode-footer-btn stage-mode-nav-btn stage-mode-next"
          onClick={() => currentIndex >= 0 && currentIndex < setlistSongs.length - 1 && goToSong(setlistSongs[currentIndex + 1].id)}
          disabled={currentIndex < 0 || currentIndex >= setlistSongs.length - 1}
          aria-label="Lagu berikutnya"
          title={currentIndex < 0 ? 'Lagu di luar setlist — pilih lagu dari setlist untuk navigasi' : (currentIndex < setlistSongs.length - 1 ? (setlistSongs[currentIndex + 1].title || 'Lagu berikutnya') : 'Lagu terakhir')}
        >
          →
        </button>
      </footer>

      {/* ======== Sheets ======== */}
      {sheetOpen && (
        <div
          className="stage-mode-sheet-overlay"
          onClick={() => setSheetOpen(null)}
          role="presentation"
        >
          <div
            ref={sheetRef}
            className="stage-mode-sheet"
            role="menu"
            aria-label="Pilih"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pilih setlist */}
            {sheetOpen === 'setlist' && (
              <>
                <div className="stage-mode-sheet-title">Pilih setlist panggung</div>
                <div className="stage-mode-sheet-search">
                  <input
                    type="search"
                    className="stage-mode-sheet-search-input"
                    placeholder="Cari setlist…"
                    value={setlistSearchQuery}
                    onChange={(e) => setSetlistSearchQuery(e.target.value)}
                    aria-label="Cari setlist"
                  />
                </div>
                {/* Filter band: dropdown pemilih band (termasuk "Semua band"). */}
                <div
                  className="stage-mode-sheet-filter"
                  role="group"
                  aria-label="Filter band"
                >
                  <select
                    className="stage-mode-sheet-select"
                    value={String(bandId || '')}
                    onChange={(e) => {
                      const next = e.target.value;
                      // Pilih band, persist, dan arahkan ke setlist pertama
                      // milik band tersebut.
                      handleSelectBand(next);
                    }}
                    aria-label="Filter band"
                  >
                    <option value="">Semua band</option>
                    {bands.map((b) => {
                      const id = String(b.bandId || b.id);
                      return (
                        <option key={id} value={id}>
                          {b.name || b.bandName || 'Band'}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="stage-mode-sheet-list" role="menu">
                  {filteredSetlists
                    .filter((sl) => {
                      const sq = setlistSearchQuery.trim().toLowerCase();
                      return !sq || String(sl.name || '').toLowerCase().includes(sq);
                    })
                    .map((sl) => (
                      <button
                        key={sl.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={String(sl.id) === String(activeSetlist?.id || setlistId)}
                        className={`stage-mode-sheet-item${String(sl.id) === String(activeSetlist?.id || setlistId) ? ' active' : ''}`}
                        onClick={() => handleSelectSetlist(String(sl.id))}
                      >
                        <span className="stage-mode-sheet-name">{sl.name || 'Tanpa nama'}</span>
                        {Array.isArray(sl.songs) && sl.songs.length > 0 && (
                          <span className="stage-mode-pill">{sl.songs.length} lagu</span>
                        )}
                      </button>
                    ))}
                  {filteredSetlists.length === 0 && (
                    <div className="stage-mode-sheet-empty">Tidak ada setlist.</div>
                  )}
                </div>
              </>
            )}

            {/* Daftar lagu setlist */}
            {sheetOpen === 'song' && (
              <>
                <div className="stage-mode-sheet-title">
                  Daftar lagu — {setlistSongs.length} lagu
                </div>
                {/* Dropdown setlist: ganti setlist langsung dari daftar lagu,
                    difilter sesuai band yang aktif. */}
                <div className="stage-mode-sheet-toolbar">
                  <div className="stage-mode-sheet-field">
                    <label
                      className="stage-mode-sheet-field-label"
                      htmlFor="stage-song-sheet-band"
                    >
                      Band
                    </label>
                    <select
                      id="stage-song-sheet-band"
                      className="stage-mode-sheet-select"
                      value={String(bandId || '')}
                      onChange={(e) => {
                        const nextBandId = e.target.value;
                        setBandId(nextBandId);
                        writeStored(STORAGE_KEYS.STAGE_BAND, nextBandId);
                        // Pindah ke setlist pertama milik band ini, sama seperti
                        // alur pemilih band di sheet setlist. Dihitung langsung
                        // dari setlists karena filteredSetlists masih memakai
                        // bandId lama pada render ini.
                        const firstSetlist = setlists.find(
                          (sl) => !nextBandId || String(sl.bandId || '') === String(nextBandId) || !sl.bandId,
                        );
                        if (firstSetlist) handleSelectSetlist(String(firstSetlist.id));
                      }}
                    >
                      <option value="">Semua band</option>
                      {bands.map((b) => (
                        <option key={String(b.bandId || b.id)} value={String(b.bandId || b.id)}>
                          {b.name || b.bandName || 'Band'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="stage-mode-sheet-field">
                    <label
                      className="stage-mode-sheet-field-label"
                      htmlFor="stage-song-sheet-setlist"
                    >
                      Setlist
                    </label>
                    <select
                      id="stage-song-sheet-setlist"
                      className="stage-mode-sheet-select"
                      value={String(activeSetlist?.id || setlistId || '')}
                      onChange={(e) => handleSelectSetlist(e.target.value)}
                    >
                      {(setlistId || activeSetlist?.id) && !setlists.some((sl) => String(sl.id) === String(activeSetlist?.id || setlistId)) && (
                        <option value={String(activeSetlist?.id || setlistId)}>
                          {activeSetlist?.name || 'Setlist aktif'}
                        </option>
                      )}
                      {filteredSetlists.map((sl) => (
                        <option key={sl.id} value={String(sl.id)}>
                          {sl.name || 'Tanpa nama'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="stage-mode-sheet-list" role="menu">
                  {setlistDetailLoading && (
                    <div className="stage-mode-sheet-empty">Memuat lagu setlist…</div>
                  )}
                  {!setlistDetailLoading && setlistSongs.map((s, i) => (
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
                  {!setlistDetailLoading && setlistDetailError && (
                    <div className="stage-mode-sheet-empty">
                      <div>{setlistDetailError}</div>
                      <button
                        type="button"
                        className="btn btn-secondary stage-mode-footer-btn"
                        style={{ marginTop: 8 }}
                        onClick={() => setSetlistDetailRetry((v) => v + 1)}
                      >
                        Coba lagi
                      </button>
                    </div>
                  )}
                  {!setlistDetailLoading && !setlistDetailError && setlistSongs.length === 0 && (
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
                <div className="stage-mode-sheet-list stage-mode-sheet-list--search" role="menu">
                  {dataLoading && (
                    <div className="stage-mode-sheet-empty">Memuat data lagu…</div>
                  )}
                  {!dataLoading && dataError && (
                    <div className="stage-mode-sheet-empty">
                      {dataError}
                      <button
                        type="button"
                        className="stage-mode-sheet-ext-btn"
                        onClick={() => setDataReloadNonce((n) => n + 1)}
                      >
                        Coba lagi
                      </button>
                    </div>
                  )}
                  {!dataLoading && !dataError && searchInSetlist.length > 0 && (
                    <div className="stage-mode-sheet-group-label">Dalam setlist ({searchInSetlist.length})</div>
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
                        <span className="stage-mode-sheet-item-title">{s.title || 'Tanpa judul'}</span>
                        {s.artist && <span className="stage-mode-sheet-item-artist">{s.artist}</span>}
                      </span>
                      {s.key && <span className="stage-mode-pill">{s.key}</span>}
                    </button>
                  ))}
                  {!dataLoading && !dataError && searchAllSongs.length > 0 && (
                    <div className="stage-mode-sheet-group-label">Repertoire aplikasi ({searchAllSongs.length})</div>
                  )}
                  {!dataLoading && !dataError && searchAllSongs.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={String(s.id) === String(effectiveSongId)}
                      onClick={() => goToSong(s.id)}
                      className={`stage-mode-sheet-item${String(s.id) === String(effectiveSongId) ? ' active' : ''}`}
                    >
                      <span className="stage-mode-sheet-name">
                        <span className="stage-mode-sheet-item-title">{s.title || 'Tanpa judul'}</span>
                        {s.artist && <span className="stage-mode-sheet-item-artist">{s.artist}</span>}
                      </span>
                      {s.key && <span className="stage-mode-pill">{s.key}</span>}
                    </button>
                  ))}
                  {!dataLoading && !dataError && q && (
                    <>
                      <div className="stage-mode-sheet-group-label">Di luar aplikasi</div>
                      <div className="stage-mode-sheet-external">
                        <a
                          className="stage-mode-sheet-ext-btn"
                          href={googleUrl}
                          target="_blank"
                          rel="noreferrer"
                          role="menuitem"
                        >
                          🌐 Google
                        </a>
                        <a
                          className="stage-mode-sheet-ext-btn"
                          href={youtubeSearchUrl}
                          target="_blank"
                          rel="noreferrer"
                          role="menuitem"
                        >
                          ▶ YouTube
                        </a>
                      </div>
                      <p className="stage-mode-sheet-hint">
                        Buka hasil di tab baru, lalu kembali ke Stage Mode.
                      </p>
                    </>
                  )}
                  {!hasLocalResults && !q && !dataLoading && !dataError && (
                    <div className="stage-mode-sheet-empty">
                      {setlistSongs.length === 0 && allSongs.length === 0
                        ? 'Belum ada lagu di aplikasi — tambahkan lewat menu Lagu.'
                        : 'Ketik untuk mencari lagu…'}
                    </div>
                  )}
                  {!hasLocalResults && q && !dataLoading && !dataError && (
                    <div className="stage-mode-sheet-empty">Tidak ada di aplikasi — cari di Google/YouTube.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
