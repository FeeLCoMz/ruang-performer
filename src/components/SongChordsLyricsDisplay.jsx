import React, { useEffect, useRef, useState } from "react";
import SongSheetMusic from "./SongSheetMusic.jsx";
import ChordDisplay from "./ChordDisplay.jsx";
import { transposeChord } from '../utils/chordUtils.js';
import {
  AUTO_SCROLL_MODES,
  normalizeAutoScrollMode,
  computeMusicalScrollSpeed,
  computeManualScrollSpeed,
  estimateBarCount,
  estimateChordCount,
  clampManualSpeedLevel,
  MIN_MANUAL_SPEED_LEVEL,
  MAX_MANUAL_SPEED_LEVEL,
  DEFAULT_MANUAL_SPEED_LEVEL,
} from '../utils/autoscrollSpeedUtils.js';

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.5;

const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

const parseBeatsPerBar = (timeSignature) => {
  const match = String(timeSignature || '4/4').trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return 4;
  const numerator = Number(match[1]);
  if (!Number.isFinite(numerator) || numerator <= 0) return 4;
  return Math.max(1, Math.min(12, numerator));
};

/**
 * SongChordsLyricsDisplay
 * Komponen utama untuk menampilkan lirik dan chord, partitur, dan autoscroll.
 * Props:
 *   - isEditingLyrics
 *   - lyricsDisplayRef
 *   - editedLyrics
 *   - setEditedLyrics
 *   - song
 *   - transpose
 *   - zoom
 *   - autoScrollActive
 *   - scrollSpeed
 *   - autoScrollMode ('MUSICAL' | 'MANUAL')
 *   - manualSpeedLevel (1-10, mode MANUAL)
 *   - setAutoScrollActive
 *   - setScrollSpeed
 *   - setAutoScrollMode
 *   - setManualSpeedLevel
 *   - currentBeat
 *   - setCurrentBeat
 *   - showSheetMusic
 *   - setShowSheetMusic
 *   - showChords — switch tampilan chord (false = lirik saja)
 */
export default function SongChordsLyricsDisplay({
  isEditingLyrics,
  lyricsDisplayRef,
  editedLyrics,
  setEditedLyrics,
  song,
  tempo,
  transpose,
  setTranspose,
  showChords,
  showLyrics = true,
  zoom,
  setZoom,
  showChordNumbers,
  showJazzChords,
  showSimpleChords,
  keySignature,
  autoScrollActive,
  scrollSpeed,
  autoScrollMode: autoScrollModeProp,
  manualSpeedLevel: manualSpeedLevelProp,
  setAutoScrollActive,
  setScrollSpeed,
  setAutoScrollMode,
  setManualSpeedLevel,
  showSheetMusic,
  setShowSheetMusic,
  youtubeRef,
  youtubeId,
  isYoutubePlaying = false,
  onYoutubePlayingChange,
  currentBeat = 0,
  timeSignature = '4/4',
  originalKey = '',
  targetKey = '',
  // Tampilan panggung dari toolbar: skala font, mode fokus, lock layar.
  fontScale = 1,
  focusMode = false,
  screenLocked = false,
  // Konteks setlist: untuk info lagu berikutnya (Up Next).
  setlistNav = null,
}) {
  const pinchStateRef = useRef({ active: false, startDistance: 0, startZoom: 1 });
  const zoomRef = useRef(zoom);
  const zoomHudTimerRef = useRef(null);
  const controlsHideTimerRef = useRef(null);
  const [zoomHudVisible, setZoomHudVisible] = useState(false);
  const [zoomHudText, setZoomHudText] = useState(`${Math.round((zoom || 1) * 100)}%`);
  // isYoutubePlaying comes from the page as a prop: it owns the polling, so the
  // timestamp buttons and the fullscreen controls share one source of truth.
  const [visualBeat, setVisualBeat] = useState(0);

  // Overlay lirik dihapus — fungsi fullscreen tampil kini ada di Stage Mode.
  // Mode autoscroll: 'MUSICAL' (BPM) atau 'MANUAL' (level 1-10).
  // Fallback state lokal bila parent belum mengelola mode ini.
  const [autoScrollModeLocal, setAutoScrollModeLocal] = useState(AUTO_SCROLL_MODES.MUSICAL);
  const [manualSpeedLevelLocal, setManualSpeedLevelLocal] = useState(DEFAULT_MANUAL_SPEED_LEVEL);
  const autoScrollMode = normalizeAutoScrollMode(autoScrollModeProp || autoScrollModeLocal);
  const setAutoScrollModeSafe = setAutoScrollMode || setAutoScrollModeLocal;
  const manualSpeedLevel = clampManualSpeedLevel(manualSpeedLevelProp || manualSpeedLevelLocal);
  const setManualSpeedLevelSafe = setManualSpeedLevel || setManualSpeedLevelLocal;

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Font scale dari toolbar diterapkan sebagai CSS var: .cd memakai
  // font-size skala ini, tidak mengganggu zoom pinch/wheel.
  useEffect(() => {
    const el = lyricsDisplayRef?.current;
    if (!el) return;
    el.style.setProperty('--lyrics-font-scale', String(Number(fontScale) || 1));
  }, [lyricsDisplayRef, fontScale]);

  // Lock layar: matikan interaksi pointer & wheel di panel supaya sentuhan
  // tak sengaja (scroll/tap saat perangkat dipegang) tidak mengubah tampilan.
  useEffect(() => {
    const el = lyricsDisplayRef?.current;
    if (!el) return undefined;
    if (!screenLocked) return undefined;
    const blockWheel = (e) => e.preventDefault();
    el.addEventListener('wheel', blockWheel, { passive: false });
    return () => el.removeEventListener('wheel', blockWheel);
  }, [lyricsDisplayRef, screenLocked]);

  // Mode fokus: sorot bagian (section) aktif — baris lirik sebelum section
  // berikutnya diredupkan, section aktif tetap penuh. Dikelola via class
  // pada baris section dan container (lihat CSS lyrics-focus-mode).
  const [activeFocusSection, setActiveFocusSection] = useState(null);
  useEffect(() => {
    if (!focusMode) {
      setActiveFocusSection(null);
      return;
    }
    const container = lyricsDisplayRef?.current;
    if (!container) return undefined;
    const sections = Array.from(container.querySelectorAll('.cd-section-struct'));
    if (!sections.length) return undefined;

    const updateActive = () => {
      const viewTop = container.getBoundingClientRect().top;
      let current = null;
      for (const el of sections) {
        if (el.getBoundingClientRect().top <= viewTop + container.clientHeight * 0.3) {
          current = el;
        } else {
          break;
        }
      }
      setActiveFocusSection(current ? current.getAttribute('data-section-key') : null);
    };

    updateActive();
    container.addEventListener('scroll', updateActive, { passive: true });
    return () => container.removeEventListener('scroll', updateActive);
  }, [focusMode, lyricsDisplayRef, song?.id, song?.lyrics]);


  useEffect(() => {
    return () => {
      if (zoomHudTimerRef.current) {
        clearTimeout(zoomHudTimerRef.current);
      }
      if (controlsHideTimerRef.current) {
        clearTimeout(controlsHideTimerRef.current);
      }
    };
  }, []);

  // (Fitur fullscreen lirik dihapus: state isFullscreen, efek fullscreenchange,
  //  tombol Esc, dan kontrol fullscreen. Zoom pinch/wheel tetap aktif.)

  useEffect(() => {
    const el = lyricsDisplayRef?.current;
    if (!el || typeof setZoom !== 'function') return;

    const getDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const handleWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      setZoom((prev) => {
        const nextZoom = clampZoom(prev + delta);
        setZoomHudText(`${Math.round(nextZoom * 100)}%`);
        setZoomHudVisible(true);
        if (zoomHudTimerRef.current) clearTimeout(zoomHudTimerRef.current);
        zoomHudTimerRef.current = setTimeout(() => setZoomHudVisible(false), 800);
        return nextZoom;
      });
    };

    const handleTouchStart = (e) => {
      if (e.touches.length !== 2) return;
      pinchStateRef.current = {
        active: true,
        startDistance: getDistance(e.touches),
        startZoom: zoomRef.current,
      };
    };

    const handleTouchMove = (e) => {
      const state = pinchStateRef.current;
      if (!state.active || e.touches.length !== 2) return;

      const nextDistance = getDistance(e.touches);
      if (!state.startDistance) return;

      e.preventDefault();
      const ratio = nextDistance / state.startDistance;
      const nextZoom = clampZoom(state.startZoom * ratio);
      setZoom(nextZoom);
      setZoomHudText(`${Math.round(nextZoom * 100)}%`);
      setZoomHudVisible(true);
      if (zoomHudTimerRef.current) clearTimeout(zoomHudTimerRef.current);
      zoomHudTimerRef.current = setTimeout(() => setZoomHudVisible(false), 800);
    };

    const handleTouchEnd = () => {
      if (pinchStateRef.current.active) {
        pinchStateRef.current.active = false;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [lyricsDisplayRef, setZoom]);

  const normalizedBpm = Math.max(40, Math.min(240, Number(tempo) || Number(song?.tempo) || 120));
  const normalizedScrollSpeed = Math.max(40, Math.min(240, Number(scrollSpeed) || normalizedBpm));
  const beatsPerBar = parseBeatsPerBar(timeSignature || song?.time_signature || '4/4');
  const effectiveShowChords = showChords;
  const effectiveShowLyrics = showLyrics;

  // Autoscroll: Switchable Mode.
  // - MUSICAL: kecepatan dihitung dari parameter musik. T_baris =
  //   barCount * (60/BPM) * timeSignatureNumerator, atau (tanpa barCount)
  //   chordCount * (60/BPM) * beatsPerChord. V = lineHeightsPx / T_baris.
  // - MANUAL : V = baseSpeedMultiplier * userSpeedLevel (10-100 px/s).
  useEffect(() => {
    const container = lyricsDisplayRef?.current;
    if (!autoScrollActive || !container) return undefined;

    let rafId = null;
    let lastTs = null;
    let accumulator = 0;

    const measureLineMetrics = () => {
      const lineEls = Array.from(container.querySelectorAll('.cd-chord, .cd-number, .cd-lyrics-line'));
      if (!lineEls.length) {
        return { lineStep: 24, lineHeightsPx: 24, barCount: 0, chordCount: 0, text: '' };
      }
      const firstEl = lineEls[0];
      const style = window.getComputedStyle(firstEl);
      const lineHeight = parseFloat(style.lineHeight)
        || parseFloat(style.fontSize) * 1.6
        || firstEl.getBoundingClientRect().height
        || 24;

      // Tinggi blok baris sesungguhnya: jarak baris chord ini ke baris chord
      // berikutnya (mencakup chord + baris liriknya). Tanpa ini, mode MUSICAL
      // membagi durasi 1 baris ke tinggi elemen chord saja -> kecepatan nyaris 0.
      let blockHeight = Math.max(8, Math.round(lineHeight));
      if (lineEls.length > 1) {
        const firstRect = firstEl.getBoundingClientRect();
        const nextRect = lineEls[1].getBoundingClientRect();
        const distance = Math.round(nextRect.top - firstRect.top);
        if (Number.isFinite(distance) && distance > blockHeight) {
          blockHeight = distance;
        }
      }

      const text = firstEl.textContent || '';
      return {
        lineStep: blockHeight,
        lineHeightsPx: blockHeight,
        barCount: estimateBarCount(text),
        chordCount: estimateChordCount(text),
        text,
      };
    };

    const computePixelsPerSecond = () => {
      if (autoScrollMode === AUTO_SCROLL_MODES.MANUAL) {
        // Mode konvensional: slider/preset level 1-10 (10-100 px/s).
        return computeManualScrollSpeed({ userSpeedLevel: manualSpeedLevel });
      }
      // Mode musik: dari BPM + time signature + bar/chord per baris.
      // BPM yang dipakai adalah scrollSpeed (BPM efektif) — tombol −/+ di
      // toolbar mengubah nilai ini; default-nya tempo lagu. Tanpa ini,
      // perubahan tombol −/+ tidak memengaruhi kecepatan scroll nyata.
      const metrics = measureLineMetrics();
      const params = {
        lineHeightsPx: metrics.lineHeightsPx,
        barCount: metrics.barCount,
        chordCount: metrics.chordCount,
        bpm: normalizedScrollSpeed,
        timeSignatureNumerator: beatsPerBar,
        beatsPerChord: beatsPerBar,
      };
      return computeMusicalScrollSpeed(params);
    };

    let pixelsPerSecond = computePixelsPerSecond();

    const tick = (ts) => {
      if (lastTs === null) lastTs = ts;
      const deltaMs = ts - lastTs;
      lastTs = ts;

      // Re-hitung kecepatan tiap frame agar perubahan mode/BPM/level langsung terasa.
      pixelsPerSecond = computePixelsPerSecond();
      accumulator += (pixelsPerSecond * deltaMs) / 1000;

      if (accumulator >= 1) {
        const wholePixels = Math.floor(accumulator);
        accumulator -= wholePixels;
        const maxScroll = container.scrollHeight - container.clientHeight;
        if (maxScroll > 0) {
          if (container.scrollTop >= maxScroll - 1) {
            setAutoScrollActive(false);
            return;
          }
          container.scrollTop = Math.min(maxScroll, container.scrollTop + wholePixels);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [autoScrollActive, autoScrollMode, manualSpeedLevel, normalizedBpm, normalizedScrollSpeed, beatsPerBar, lyricsDisplayRef, setAutoScrollActive, song?.id, showChords, showChordNumbers, showJazzChords, showSimpleChords, zoom]);

  // Indikator ketukan visual saat autoscroll nonaktif.
  useEffect(() => {
    if (autoScrollActive) return undefined;
    const intervalDuration = Math.max(120, Math.round(60000 / normalizedBpm));
    const intervalId = setInterval(() => {
      setVisualBeat((prev) => (prev + 1) % beatsPerBar);
    }, intervalDuration);

    return () => clearInterval(intervalId);
  }, [autoScrollActive, normalizedBpm, beatsPerBar]);

  const activeVisualBeat = autoScrollActive
    ? (Number.isFinite(Number(currentBeat))
      ? ((Number(currentBeat) % beatsPerBar) + beatsPerBar) % beatsPerBar
      : 0)
    : visualBeat;

  const nudgeScrollSpeed = (delta) => {
    // Mode MANUAL: delta berlaku pada level kecepatan (1-10).
    if (autoScrollMode === AUTO_SCROLL_MODES.MANUAL) {
      setManualSpeedLevelSafe((prev) => clampManualSpeedLevel((Number(prev) || DEFAULT_MANUAL_SPEED_LEVEL) + delta));
      return;
    }
    setScrollSpeed((prev) => {
      const base = Number(prev) || normalizedBpm;
      return Math.max(40, Math.min(240, base + delta));
    });
  };

  const resetScrollSpeed = () => {
    if (autoScrollMode === AUTO_SCROLL_MODES.MANUAL) {
      setManualSpeedLevelSafe(DEFAULT_MANUAL_SPEED_LEVEL);
      return;
    }
    setScrollSpeed(normalizedBpm);
  };

  const toggleAutoScrollMode = () => {
    setAutoScrollModeSafe(
      autoScrollMode === AUTO_SCROLL_MODES.MUSICAL
        ? AUTO_SCROLL_MODES.MANUAL
        : AUTO_SCROLL_MODES.MUSICAL
    );
  };

  // (Key info untuk performance bar dihapus — bar kontrol itu sudah tidak ada.)

  // (Fitur fullscreen lirik dihapus: handler exit fullscreen juga tidak dipakai.)

  return (
    <>
    <div className="song-lyrics-display" ref={lyricsDisplayRef}>
      {zoomHudVisible && (
        <div className="song-lyrics-zoom-hud" aria-live="polite">Zoom {zoomHudText}</div>
      )}
      {/* Tombol Lihat Partitur (selalu tampil jika ada MusicXML) */}
      {song?.sheetMusicXml && (
        <button
          className="btn btn-secondary btn-margin-bottom"
          onClick={() => setShowSheetMusic((v) => !v)}
        >
          {showSheetMusic ? 'Sembunyikan Partitur' : 'Lihat Partitur'}
        </button>
      )}
      {/* Tampilkan partitur jika diaktifkan. Performance mode tetap boleh
          menampilkan partitur karena ini justru fitur yang dibutuhkan saat tampil. */}
      {showSheetMusic && song?.sheetMusicXml && (
        <SongSheetMusic sheetMusicXml={song.sheetMusicXml} />
      )}
      <ChordDisplay
        song={song}
        transpose={transpose}
        zoom={zoom}
        fontScale={fontScale}
        currentBeat={activeVisualBeat}
        timeSignature={timeSignature || song?.time_signature || '4/4'}
        showChords={effectiveShowChords}
        showLyrics={effectiveShowLyrics}
        showChordNumbers={showChordNumbers}
        showJazzChords={showJazzChords}
        showSimpleChords={showSimpleChords}
        keySignature={keySignature || song?.key || 'C'}
        isPlaying={isYoutubePlaying}
        focusSectionKey={focusMode ? activeFocusSection : null}
        onTimestampClick={(seconds) => {
          if (youtubeRef && youtubeRef.current && typeof youtubeRef.current.handleSeek === 'function') {
            youtubeRef.current.handleSeek(seconds);
          }
        }}
        onTimestampPause={() => {
          if (youtubeRef && youtubeRef.current && typeof youtubeRef.current.handlePause === 'function') {
            youtubeRef.current.handlePause();
          }
        }}
              />
      </div>

      {/* Info lagu berikutnya (Up Next) — tampil bila ada lagu setelah ini
          dalam setlist aktif. Setelah lagu terakhir, tampil tombol kembali
          ke daftar setlist. */}
      {setlistNav && (setlistNav.hasNext || typeof setlistNav.onOpenSetlist === 'function') && (
        <div className="setlist-up-next" role="complementary" aria-label="Lagu berikutnya">
          {setlistNav.hasNext ? (
            <>
              <span className="setlist-up-next-label">Up Next</span>
              <button
                type="button"
                className="setlist-up-next-song"
                onClick={setlistNav.onNext}
                title={`Buka: ${setlistNav.nextTitle}`}
              >
                <span className="setlist-up-next-number" aria-hidden="true">
                  {setlistNav.songNumber + 1}
                </span>
                <span className="setlist-up-next-title">{setlistNav.nextTitle || 'Lagu berikutnya'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="setlist-up-next-song"
              onClick={setlistNav.onOpenSetlist}
              title="Kembali ke daftar setlist"
            >
              <span className="setlist-up-next-number" aria-hidden="true">🏁</span>
              <span className="setlist-up-next-title">Lagu terakhir — kembali ke setlist</span>
            </button>
          )}
        </div>
      )}
    </>
  );
}
