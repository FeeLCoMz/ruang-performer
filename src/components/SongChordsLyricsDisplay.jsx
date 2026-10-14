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
  performanceKeyOverride = '',
  pianoRecommendation = null,
  onApplyRecommendedTranspose,
  // Tampilan panggung dari toolbar: skala font, mode fokus, lock layar.
  fontScale = 1,
  focusMode = false,
  screenLocked = false,
}) {
  const pinchStateRef = useRef({ active: false, startDistance: 0, startZoom: 1 });
  const handleExitFullscreenRef = useRef(null);
  const zoomRef = useRef(zoom);
  const zoomHudTimerRef = useRef(null);
  const controlsHideTimerRef = useRef(null);
  const [zoomHudVisible, setZoomHudVisible] = useState(false);
  const [zoomHudText, setZoomHudText] = useState(`${Math.round((zoom || 1) * 100)}%`);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  // isYoutubePlaying comes from the page as a prop: it owns the polling, so the
  // timestamp buttons and the fullscreen controls share one source of truth.
  const [visualBeat, setVisualBeat] = useState(0);
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

  useEffect(() => {
    const el = lyricsDisplayRef?.current;
    if (!el) return;

    const checkFullscreen = () => {
      const active = document.fullscreenElement === el
        || document.webkitFullscreenElement === el
        || document.msFullscreenElement === el;
      setIsFullscreen(active);
      if (active) {
        setControlsVisible(false);
      }
    };

    checkFullscreen();

    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    document.addEventListener('MSFullscreenChange', checkFullscreen);

    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
      document.removeEventListener('MSFullscreenChange', checkFullscreen);
    };
  }, [lyricsDisplayRef]);

  useEffect(() => {
    if (!isFullscreen) return undefined;

    const isEditableTarget = (target) => {
      const tag = target?.tagName?.toLowerCase?.();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
    };

    const handleKeyDown = (event) => {
      if (isEditableTarget(event.target)) return;
      const key = String(event.key || '').toLowerCase();

      if (key === 'escape') {
        handleExitFullscreenRef.current?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isFullscreen,
  ]);

  useEffect(() => {
    if (!isFullscreen) {
      setControlsVisible(false);
      if (controlsHideTimerRef.current) {
        clearTimeout(controlsHideTimerRef.current);
      }
      return;
    }

    // Kontrol perform di fullscreen tetap tampil permanen di semua mode.
    setControlsVisible(true);
    if (controlsHideTimerRef.current) {
      clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
    return;
  }, [isFullscreen, controlsVisible, transpose, autoScrollActive, scrollSpeed]);

  useEffect(() => {
    const el = lyricsDisplayRef?.current;
    if (!el || typeof setZoom !== 'function') return;

    const isFullscreenActive = () => {
      return document.fullscreenElement === el
        || document.webkitFullscreenElement === el
        || document.msFullscreenElement === el;
    };

    const getDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const handleWheel = (e) => {
      if (!isFullscreenActive() || !e.ctrlKey) return;
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
      if (!isFullscreenActive() || e.touches.length !== 2) return;
      pinchStateRef.current = {
        active: true,
        startDistance: getDistance(e.touches),
        startZoom: zoomRef.current,
      };
    };

    const handleTouchMove = (e) => {
      if (!isFullscreenActive()) return;
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
  const currentChordModeKey = !effectiveShowChords
    ? 'hidden'
    : showChordNumbers
    ? 'number'
    : showJazzChords
      ? 'jazz'
      : showSimpleChords
        ? 'simple'
        : 'default';
  const currentChordModeLabel = !effectiveShowChords
    ? 'Off'
    : showChordNumbers
    ? 'Angka'
    : showJazzChords
      ? 'Jazz'
      : showSimpleChords
        ? 'Simple'
        : 'Default';

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
      const metrics = measureLineMetrics();
      const params = {
        lineHeightsPx: metrics.lineHeightsPx,
        barCount: metrics.barCount,
        chordCount: metrics.chordCount,
        bpm: normalizedBpm,
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
  }, [autoScrollActive, autoScrollMode, manualSpeedLevel, normalizedBpm, beatsPerBar, lyricsDisplayRef, setAutoScrollActive, song?.id, showChords, showChordNumbers, showJazzChords, showSimpleChords, zoom]);

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

  // Key info untuk kontrol performance di floating header fullscreen
  const performanceBaseKey = performanceKeyOverride || targetKey || originalKey || song?.key || '';
  const recommendedPianoKey = pianoRecommendation?.recommendedKey || '';
  const recommendedTransposeSteps = Number(pianoRecommendation?.transposeFromCurrent) || 0;
  const compactRecommendedTransposeText = recommendedTransposeSteps === 0
    ? 'sama dengan key sekarang'
    : `${recommendedTransposeSteps > 0 ? '+' : ''}${recommendedTransposeSteps}`;
  const canApplyRecommendedKey = typeof onApplyRecommendedTranspose === 'function'
    && recommendedPianoKey !== ''
    && recommendedTransposeSteps !== 0;
  // Key hasil transpose, supaya user langsung melihat efek tombol transpose
  const transposedPerformanceKey = (() => {
    if (!performanceBaseKey) return '';
    if (!transpose) return performanceBaseKey;
    return transposeChord(performanceBaseKey, transpose) || performanceBaseKey;
  })();

  const handleExitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      return;
    }
    if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
      return;
    }
    if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  };

  handleExitFullscreenRef.current = handleExitFullscreen;

  return (
    <div className="song-lyrics-display" ref={lyricsDisplayRef}>
      {isFullscreen && (
        <>
          <div className="song-lyrics-fullscreen-tempo-led-inline" title={`Tempo ${normalizedBpm} BPM`}>
            <span
              className="song-info-tempo-led"
              style={{ animationDuration: `${Math.round(60000 / normalizedBpm)}ms` }}
              aria-hidden="true"
            />
            <span className="song-lyrics-fullscreen-tempo-led-inline-text">{normalizedBpm}</span>
          </div>
        </>
      )}
      {isFullscreen && (
        <div className="song-lyrics-fullscreen-performance-bar" role="group" aria-label="Kontrol performance">
          <div className="song-lyrics-fullscreen-perf-cluster">
            <div className="song-lyrics-fullscreen-perf-group song-lyrics-fullscreen-perf-transpose" role="group" aria-label="Transpose key">
              <span className="song-lyrics-fullscreen-perf-chip-icon" aria-hidden="true">🎹</span>
              <button
                type="button"
                className="btn btn-secondary song-lyrics-fullscreen-perf-btn song-lyrics-fullscreen-perf-step-btn"
                onClick={() => setTranspose((prev) => (prev || 0) - 1)}
                aria-label="Turunkan key 1 semitone"
                title="Turunkan key 1 semitone"
              >
                −
              </button>
              <span
                className="song-lyrics-fullscreen-perf-key"
                aria-live="polite"
                title={`Key aktif: ${transposedPerformanceKey || '-'}${transpose ? ` (${transpose > 0 ? '+' : ''}${transpose} dari ${performanceBaseKey})` : ''}`}
              >
                {transposedPerformanceKey || '-'}
              </span>
              <button
                type="button"
                className="btn btn-secondary song-lyrics-fullscreen-perf-btn song-lyrics-fullscreen-perf-step-btn"
                onClick={() => setTranspose((prev) => (prev || 0) + 1)}
                aria-label="Naikkan key 1 semitone"
                title="Naikkan key 1 semitone"
              >
                +
              </button>
              <span className="song-lyrics-fullscreen-perf-offset" aria-live="polite">
                {transpose > 0 ? `+${transpose}` : transpose}
              </span>
              <button
                type="button"
                className="btn btn-secondary song-lyrics-fullscreen-perf-btn song-lyrics-fullscreen-perf-step-btn"
                onClick={() => setTranspose(0)}
                aria-label="Reset transpose ke key asli"
                title={`Reset transpose${performanceBaseKey ? ` ke ${performanceBaseKey}` : ''}`}
                disabled={(transpose || 0) === 0}
              >
                ⟲
              </button>
            </div>
            <button
              type="button"
              className="btn btn-secondary song-lyrics-fullscreen-perf-btn song-lyrics-fullscreen-easy-key-btn"
              onClick={() => onApplyRecommendedTranspose?.(recommendedTransposeSteps)}
              disabled={!canApplyRecommendedKey}
              title={recommendedPianoKey
                ? `Terapkan key mudah ${recommendedPianoKey} (${compactRecommendedTransposeText})`
                : 'Tidak ada rekomendasi key mudah'}
              aria-label="Gunakan key mudah yang disarankan"
            >
              <span className="song-lyrics-fullscreen-perf-chip-icon" aria-hidden="true">✨</span>
              <span className="song-lyrics-fullscreen-perf-easy-label">Mudah</span>
              <span className="song-lyrics-fullscreen-perf-easy-value">
                {recommendedPianoKey || '-'}
              </span>
            </button>
          </div>

          <div className="song-lyrics-fullscreen-perf-cluster song-lyrics-fullscreen-perf-cluster-right">
            <div className="song-lyrics-fullscreen-perf-group" role="group" aria-label="Tempo dan autoscroll">
              <span className="song-lyrics-fullscreen-perf-chip song-lyrics-fullscreen-perf-tempo" title={`Tempo lagu ${normalizedBpm} BPM`}>
                <span
                  className="song-info-tempo-led"
                  style={{ animationDuration: `${Math.round(60000 / normalizedBpm)}ms` }}
                  aria-hidden="true"
                />
                <span className="song-lyrics-fullscreen-perf-chip-value">{normalizedBpm}</span>
              </span>
              <button
                type="button"
                className={`btn btn-secondary song-lyrics-fullscreen-perf-btn song-lyrics-fullscreen-perf-mode-btn${autoScrollMode === AUTO_SCROLL_MODES.MANUAL ? ' is-manual' : ''}`}
                onClick={toggleAutoScrollMode}
                aria-label={`Mode autoscroll: ${autoScrollMode === AUTO_SCROLL_MODES.MUSICAL ? 'Musik (BPM)' : 'Manual (Level)'}. Klik untuk ganti.`}
                title={`Mode autoscroll: ${autoScrollMode === AUTO_SCROLL_MODES.MUSICAL ? 'Musik (BPM)' : 'Manual (Level)'}`}
              >
                {autoScrollMode === AUTO_SCROLL_MODES.MUSICAL ? '♪' : '≡'}
              </button>
              <button
                type="button"
                className={`btn song-lyrics-fullscreen-perf-btn song-lyrics-fullscreen-perf-as-btn ${autoScrollActive ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAutoScrollActive((prev) => !prev)}
                aria-label={autoScrollActive ? 'Matikan autoscroll' : 'Nyalakan autoscroll'}
                title={autoScrollActive ? 'Matikan autoscroll' : 'Nyalakan autoscroll'}
              >
                AS
              </button>
              <button
                type="button"
                className="btn btn-secondary song-lyrics-fullscreen-perf-btn song-lyrics-fullscreen-perf-step-btn"
                onClick={() => nudgeScrollSpeed(-2)}
                aria-label="Kurangi kecepatan autoscroll"
                title="Kurangi kecepatan autoscroll"
              >
                −
              </button>
              <span
                className="song-lyrics-fullscreen-perf-speed"
                aria-live="polite"
                title={`Kecepatan autoscroll ${autoScrollMode === AUTO_SCROLL_MODES.MANUAL ? `Level ${manualSpeedLevel}` : `${normalizedScrollSpeed} BPM`}`}
              >
                {autoScrollMode === AUTO_SCROLL_MODES.MANUAL ? `Lv ${manualSpeedLevel}` : normalizedScrollSpeed}
              </span>
              <button
                type="button"
                className="btn btn-secondary song-lyrics-fullscreen-perf-btn song-lyrics-fullscreen-perf-step-btn"
                onClick={() => nudgeScrollSpeed(2)}
                aria-label="Tambah kecepatan autoscroll"
                title="Tambah kecepatan autoscroll"
              >
                +
              </button>
              <button
                type="button"
                className="btn btn-secondary song-lyrics-fullscreen-perf-btn song-lyrics-fullscreen-perf-step-btn"
                onClick={resetScrollSpeed}
                aria-label="Reset ke tempo lagu"
                title="Reset ke tempo lagu"
                disabled={normalizedScrollSpeed === normalizedBpm}
              >
                ⟲
              </button>
            </div>
            {youtubeId && youtubeRef && (
              <div className="song-lyrics-fullscreen-perf-group" role="group" aria-label="YouTube">
                <button
                  type="button"
                  className="btn btn-secondary song-lyrics-fullscreen-perf-btn"
                  onClick={() => {
                    if (youtubeRef.current && typeof youtubeRef.current.handleTogglePlayPause === 'function') {
                      youtubeRef.current.handleTogglePlayPause();
                      setTimeout(() => {
                        const state = youtubeRef.current?.getPlayerState?.();
                        onYoutubePlayingChange?.(state === 1);
                      }, 50);
                    }
                  }}
                  aria-label={isYoutubePlaying ? 'Pause YouTube' : 'Play YouTube'}
                  title={isYoutubePlaying ? 'Pause YouTube' : 'Play YouTube'}
                >
                  {isYoutubePlaying ? '⏸' : '▶'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary song-lyrics-fullscreen-perf-btn"
                  onClick={() => {
                    if (youtubeRef.current && typeof youtubeRef.current.handleSeek === 'function') {
                      youtubeRef.current.handleSeek(0);
                      setTimeout(() => {
                        const state = youtubeRef.current?.getPlayerState?.();
                        onYoutubePlayingChange?.(state === 1);
                      }, 50);
                    }
                  }}
                  aria-label="Putar dari awal"
                  title="Putar dari awal"
                >
                  ⏮
                </button>
              </div>
            )}
            <button
              type="button"
              className="btn btn-secondary song-lyrics-fullscreen-perf-btn"
              onClick={handleExitFullscreen}
              aria-label="Keluar fullscreen"
              title="Keluar fullscreen"
            >
              ⤫
            </button>
          </div>
        </div>
      )}
      {isFullscreen && (
      <div
        className={`song-lyrics-fullscreen-quick-controls${controlsVisible ? ' is-visible' : ''}`}
        role="group"
        aria-label="Kontrol fullscreen lirik"
      >
        <div className="song-lyrics-fullscreen-control-row" role="group" aria-label="Transpose">
            <span className="song-lyrics-fullscreen-control-label">Tr</span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTranspose((prev) => prev - 1)}
              aria-label="Transpose turun"
              title="Transpose turun"
            >
              -
            </button>
            <span className="song-lyrics-fullscreen-control-value" aria-live="polite">
              {transpose > 0 ? `+${transpose}` : transpose}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTranspose((prev) => prev + 1)}
              aria-label="Transpose naik"
              title="Transpose naik"
            >
              +
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTranspose(0)}
              aria-label="Reset transpose"
              title="Reset transpose"
              disabled={transpose === 0}
            >
              0
            </button>
          </div>
        <div
          className={`song-lyrics-fullscreen-autoscroll-rail${controlsVisible ? ' is-visible' : ''}`}
          role="group"
          aria-label="Kontrol autoscroll"
        >
          <div className="song-lyrics-fullscreen-autoscroll" role="group" aria-label="Autoscroll">
            <button
              type="button"
              className={`btn song-lyrics-fullscreen-rail-btn ${autoScrollActive ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAutoScrollActive((prev) => !prev)}
              aria-label={autoScrollActive ? 'Matikan autoscroll' : 'Nyalakan autoscroll'}
              title={autoScrollActive ? 'Matikan autoscroll' : 'Nyalakan autoscroll'}
            >
              AS
            </button>
            <button
              type="button"
              className="btn btn-secondary song-lyrics-fullscreen-rail-btn"
              onClick={() => nudgeScrollSpeed(-2)}
              aria-label="Kurangi kecepatan autoscroll"
              title="Kurangi kecepatan autoscroll"
            >
              -
            </button>
            <button
              type="button"
              className={`btn btn-secondary song-lyrics-fullscreen-rail-btn song-lyrics-fullscreen-rail-mode-btn${autoScrollMode === AUTO_SCROLL_MODES.MANUAL ? ' is-manual' : ''}`}
              onClick={toggleAutoScrollMode}
              aria-label={`Mode autoscroll: ${autoScrollMode === AUTO_SCROLL_MODES.MUSICAL ? 'Musik (BPM)' : 'Manual (Level)'}. Klik untuk ganti.`}
              title={`Mode autoscroll: ${autoScrollMode === AUTO_SCROLL_MODES.MUSICAL ? 'Musik (BPM)' : 'Manual (Level)'}`}
            >
              {autoScrollMode === AUTO_SCROLL_MODES.MUSICAL ? '♪' : '≡'}
            </button>
            <input
              type="range"
              min={autoScrollMode === AUTO_SCROLL_MODES.MANUAL ? MIN_MANUAL_SPEED_LEVEL : 40}
              max={autoScrollMode === AUTO_SCROLL_MODES.MANUAL ? MAX_MANUAL_SPEED_LEVEL : 240}
              step={1}
              value={autoScrollMode === AUTO_SCROLL_MODES.MANUAL ? manualSpeedLevel : normalizedScrollSpeed}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (autoScrollMode === AUTO_SCROLL_MODES.MANUAL) {
                  setManualSpeedLevelSafe(next);
                } else {
                  setScrollSpeed(next);
                }
              }}
              className="song-lyrics-fullscreen-autoscroll-slider"
              aria-label="Kecepatan autoscroll"
              title="Atur kecepatan autoscroll"
            />
            <button
              type="button"
              className="btn btn-secondary song-lyrics-fullscreen-rail-btn"
              onClick={() => nudgeScrollSpeed(2)}
              aria-label="Tambah kecepatan autoscroll"
              title="Tambah kecepatan autoscroll"
            >
              +
            </button>
            <span className="song-lyrics-fullscreen-control-value song-lyrics-fullscreen-rail-value">
              {autoScrollMode === AUTO_SCROLL_MODES.MANUAL ? `Lv ${manualSpeedLevel}` : normalizedScrollSpeed}
            </span>
            <button
              type="button"
              className="btn btn-secondary song-lyrics-fullscreen-rail-btn"
              onClick={resetScrollSpeed}
              aria-label="Reset kecepatan autoscroll"
              title="Reset kecepatan autoscroll"
            >
              R
            </button>
          </div>
        </div>
        {youtubeId && youtubeRef && (
          <div className="song-lyrics-fullscreen-control-row" role="group" aria-label="YouTube">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (youtubeRef.current && typeof youtubeRef.current.handleTogglePlayPause === 'function') {
                  youtubeRef.current.handleTogglePlayPause();
                  // Update state setelah toggle
                  setTimeout(() => {
                    const state = youtubeRef.current?.getPlayerState?.();
                    onYoutubePlayingChange?.(state === 1);
                  }, 50);
                }
              }}
              aria-label={isYoutubePlaying ? 'Pause YouTube' : 'Play YouTube'}
              title={isYoutubePlaying ? 'Pause YouTube' : 'Play YouTube'}
            >
              {isYoutubePlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (youtubeRef.current && typeof youtubeRef.current.handleSeek === 'function') {
                  youtubeRef.current.handleSeek(0);
                  setTimeout(() => {
                    const state = youtubeRef.current?.getPlayerState?.();
                    onYoutubePlayingChange?.(state === 1);
                  }, 50);
                }
              }}
              aria-label="Putar dari awal"
              title="Putar dari awal"
            >
              ⏮️ Restart
            </button>
          </div>
        )}
        <div className="song-lyrics-fullscreen-control-row" role="group" aria-label="Fullscreen">
          <span
            className={`song-lyrics-fullscreen-style-badge mode-${currentChordModeKey}`}
            title={`Mode chord aktif: ${currentChordModeLabel}`}
          >
            Chord: {currentChordModeLabel}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setControlsVisible(false)}
            aria-label="Sembunyikan kontrol"
            title="Sembunyikan kontrol"
          >
            ─
          </button>
        </div>
      </div>
      )}
      {zoomHudVisible && (
        <div className="song-lyrics-zoom-hud" aria-live="polite">Zoom {zoomHudText}</div>
      )}
      {/* Tombol Lihat Partitur (selalu tampil jika ada MusicXML) */}
      {!isFullscreen && song?.sheetMusicXml && (
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
  );
}
