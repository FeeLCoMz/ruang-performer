import React, { useEffect, useRef, useState } from "react";
import AutoScrollBar from "./AutoScrollBar.jsx";
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
  zoom,
  setZoom,
  showChordNumbers,
  keySignature,
  autoScrollActive,
  scrollSpeed,
  setAutoScrollActive,
  setScrollSpeed,
  currentBeat,
  setCurrentBeat,
  showSheetMusic,
  setShowSheetMusic,
  youtubeRef,
}) {
  const pinchStateRef = useRef({ active: false, startDistance: 0, startZoom: 1 });
  const zoomRef = useRef(zoom);
  const zoomHudTimerRef = useRef(null);
  const [zoomHudVisible, setZoomHudVisible] = useState(false);
  const [zoomHudText, setZoomHudText] = useState(`${Math.round((zoom || 1) * 100)}%`);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    return () => {
      if (zoomHudTimerRef.current) {
        clearTimeout(zoomHudTimerRef.current);
      }
    };
  }, []);

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

  const normalizedBpm = Math.max(40, Math.min(240, Number(scrollSpeed) || Number(song?.tempo) || 120));
  const blinkDurationMs = Math.round(60000 / normalizedBpm);

  return (
    <div className="song-lyrics-display" ref={lyricsDisplayRef}>
      {zoomHudVisible && (
        <div className="song-lyrics-zoom-hud" aria-live="polite">Zoom {zoomHudText}</div>
      )}
      <div className="song-lyrics-fullscreen-tempo-led-row" title={`Tempo ${normalizedBpm} BPM`}>
        <span
          className="song-info-tempo-led"
          style={{ animationDuration: `${blinkDurationMs}ms` }}
          aria-hidden="true"
        />
        <span className="song-lyrics-fullscreen-tempo-led-text">Tempo {normalizedBpm} BPM</span>
      </div>
      {/* Toolbar autoscroll diganti dengan AutoScrollBar di fullscreen */}
      <AutoScrollBar
        tempo={parseInt(song?.tempo) || 120}
        active={autoScrollActive}
        speed={scrollSpeed}
        onToggle={() => setAutoScrollActive(!autoScrollActive)}
        onSpeedChange={setScrollSpeed}
        lyricsDisplayRef={lyricsDisplayRef}
        currentBeat={currentBeat}
        setCurrentBeat={setCurrentBeat}
      />
      {/* Tombol Lihat Partitur (selalu tampil jika ada MusicXML) */}
      {song?.sheetMusicXml && (
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
