import React, { useEffect, useRef, useState } from "react";
import SongSheetMusic from "./SongSheetMusic.jsx";
import ChordDisplay from "./ChordDisplay.jsx";

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.5;

const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

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
 *   - setAutoScrollActive
 *   - setScrollSpeed
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
  transpose,
  setTranspose,
  zoom,
  setZoom,
  showChordNumbers,
  showJazzChords,
  showSimpleChords,
  keySignature,
  autoScrollActive,
  scrollSpeed,
  setAutoScrollActive,
  setScrollSpeed,
  showSheetMusic,
  setShowSheetMusic,
  youtubeRef,
}) {
  const pinchStateRef = useRef({ active: false, startDistance: 0, startZoom: 1 });
  const zoomRef = useRef(zoom);
  const zoomHudTimerRef = useRef(null);
  const controlsHideTimerRef = useRef(null);
  const [zoomHudVisible, setZoomHudVisible] = useState(false);
  const [zoomHudText, setZoomHudText] = useState(`${Math.round((zoom || 1) * 100)}%`);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

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
    if (!isFullscreen) {
      setControlsVisible(false);
      if (controlsHideTimerRef.current) {
        clearTimeout(controlsHideTimerRef.current);
      }
      return;
    }

    if (!controlsVisible) {
      if (controlsHideTimerRef.current) {
        clearTimeout(controlsHideTimerRef.current);
      }
      return;
    }

    if (controlsHideTimerRef.current) {
      clearTimeout(controlsHideTimerRef.current);
    }
    controlsHideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
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

  const normalizedBpm = Math.max(40, Math.min(240, Number(song?.tempo) || 120));
  const normalizedScrollSpeed = Math.max(40, Math.min(240, Number(scrollSpeed) || normalizedBpm));
  const blinkDurationMs = Math.round(60000 / normalizedBpm);
  const currentChordModeKey = showChordNumbers
    ? 'number'
    : showJazzChords
      ? 'jazz'
      : showSimpleChords
        ? 'simple'
        : 'default';
  const currentChordModeLabel = showChordNumbers
    ? 'Angka'
    : showJazzChords
      ? 'Jazz'
      : showSimpleChords
        ? 'Simple'
        : 'Default';

  const nudgeScrollSpeed = (delta) => {
    setScrollSpeed((prev) => {
      const base = Number(prev) || normalizedBpm;
      return Math.max(40, Math.min(240, base + delta));
    });
  };

  const resetScrollSpeed = () => {
    setScrollSpeed(normalizedBpm);
  };

  const showFullscreenControls = () => {
    if (!isFullscreen) return;
    setControlsVisible(true);
    if (controlsHideTimerRef.current) {
      clearTimeout(controlsHideTimerRef.current);
    }
    controlsHideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  };

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

  return (
    <div className="song-lyrics-display" ref={lyricsDisplayRef}>
      {isFullscreen && (
        <button
          type="button"
          className="song-lyrics-fullscreen-controls-toggle"
          onClick={showFullscreenControls}
          aria-label="Tampilkan kontrol perform"
          title="Kontrol perform"
        >
          ⚙
        </button>
      )}
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
        <div className="song-lyrics-fullscreen-control-row song-lyrics-fullscreen-autoscroll" role="group" aria-label="Autoscroll">
          <button
            type="button"
            className={`btn ${autoScrollActive ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAutoScrollActive((prev) => !prev)}
            aria-label={autoScrollActive ? 'Matikan autoscroll' : 'Nyalakan autoscroll'}
            title={autoScrollActive ? 'Matikan autoscroll' : 'Nyalakan autoscroll'}
          >
            AS
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => nudgeScrollSpeed(-2)}
            aria-label="Kurangi kecepatan autoscroll"
            title="Kurangi kecepatan autoscroll"
          >
            -
          </button>
          <input
            type="range"
            min={40}
            max={240}
            step={1}
            value={normalizedScrollSpeed}
            onChange={(e) => setScrollSpeed(Number(e.target.value))}
            className="song-lyrics-fullscreen-autoscroll-slider"
            aria-label="Kecepatan autoscroll"
            title="Atur kecepatan autoscroll"
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => nudgeScrollSpeed(2)}
            aria-label="Tambah kecepatan autoscroll"
            title="Tambah kecepatan autoscroll"
          >
            +
          </button>
          <span className="song-lyrics-fullscreen-control-value">{normalizedScrollSpeed}</span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={resetScrollSpeed}
            aria-label="Reset ke tempo lagu"
            title="Reset ke tempo lagu"
            disabled={normalizedScrollSpeed === normalizedBpm}
          >
            R
          </button>
        </div>
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
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExitFullscreen}
            aria-label="Keluar fullscreen"
            title="Keluar fullscreen"
          >
            ⤫
          </button>
        </div>
      </div>
      {zoomHudVisible && (
        <div className="song-lyrics-zoom-hud" aria-live="polite">Zoom {zoomHudText}</div>
      )}
      <div
        className={`song-lyrics-fullscreen-tempo-led-row${isFullscreen ? ' song-lyrics-fullscreen-tempo-led-row-compact' : ''}`}
        title={`Tempo ${normalizedBpm} BPM`}
      >
        <span
          className="song-info-tempo-led"
          style={{ animationDuration: `${blinkDurationMs}ms` }}
          aria-hidden="true"
        />
        <span className={`song-lyrics-fullscreen-tempo-led-text${isFullscreen ? ' song-lyrics-fullscreen-tempo-led-text-compact' : ''}`}>
          {isFullscreen ? `${normalizedBpm}` : `Tempo ${normalizedBpm} BPM`}
        </span>
      </div>
      {/* Tombol Lihat Partitur (selalu tampil jika ada MusicXML) */}
      {!isFullscreen && song?.sheetMusicXml && (
        <button
          className="btn btn-secondary btn-margin-bottom"
          onClick={() => setShowSheetMusic((v) => !v)}
        >
          {showSheetMusic ? 'Sembunyikan Partitur' : 'Lihat Partitur'}
        </button>
      )}
      {/* Tampilkan partitur jika diaktifkan */}
      {showSheetMusic && song?.sheetMusicXml && (
        <SongSheetMusic sheetMusicXml={song.sheetMusicXml} />
      )}
      <ChordDisplay
        song={song}
        transpose={transpose}
        zoom={zoom}
        showChordNumbers={showChordNumbers}
        showJazzChords={showJazzChords}
        showSimpleChords={showSimpleChords}
        keySignature={keySignature || song?.key || 'C'}
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
