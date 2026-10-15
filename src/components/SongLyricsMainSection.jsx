import React, { useEffect, useState } from 'react';
import SongChordsLyricsToolbar from '../components/SongChordsLyricsToolbar.jsx';
import SongChordsLyricsDisplay from '../components/SongChordsLyricsDisplay.jsx';
import { STORAGE_KEYS } from '../utils/storageKeys.js';

const MIN_FONT_SCALE = 0.85;
const MAX_FONT_SCALE = 2.5;
const clampFontScale = (value) => Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Number(value) || 1));

const readStoredBool = (key, fallback = false) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === '1';
  } catch {
    return fallback;
  }
};

const readStoredFontScale = () => {
  try {
    const raw = Number(localStorage.getItem(STORAGE_KEYS.LYRICS_FONT_SCALE));
    return Number.isFinite(raw) && raw > 0 ? clampFontScale(raw) : 1;
  } catch {
    return 1;
  }
};

/**
 * SongLyricsMainSection
 * Komponen utama untuk menampilkan lirik dan chord (read-only).
 * Memuat toolbar panel lirik: key/tempo, autoscroll, gaya chord, YouTube,
 * plus kontrol tampilan panggung (font size, mode fokus,
 * lock layar) dan navigasi lagu setlist.
 */
export default function SongLyricsMainSection({
  lyricsDisplayRef,
  tempo,
  timeSignature,
  isMetronomeActive = false,
  setIsMetronomeActive,
  autoScrollActive,
  scrollSpeed,
  setAutoScrollActive,
  setScrollSpeed,
  autoScrollMode,
  setAutoScrollMode,
  manualSpeedLevel,
  setManualSpeedLevel,
  zoom,
  setZoom,
  song,
  transpose,
  setTranspose,
  showChords,
  showChordNumbers,
  setShowChordNumbers,
  showJazzChords,
  setShowJazzChords,
  showSimpleChords,
  setShowSimpleChords,
  originalKey = '',
  targetKey = '',
  onTempoChange,
  pianoRecommendation = null,
  onApplyRecommendedTranspose,
  keySignature,
  showSheetMusic,
  setShowSheetMusic,
  youtubeRef,
  youtubeId,
  isYoutubePlaying = false,
  setlistNav = null,
  loading = false,
  // Mode overlay lirik: dikelola parent (SongChordsPage) supaya tombol di
  // SetlistNavFooter dan layer overlay di panel ini berbagi satu state.
  overlayMode = false,
  onOverlayClose,
}) {
  // Preferensi tampilan panggung, dipersist di localStorage lintas sesi.
  const [fontScale, setFontScaleState] = useState(readStoredFontScale);
  const [focusMode, setFocusModeState] = useState(() => readStoredBool(STORAGE_KEYS.LYRICS_FOCUS_MODE));
  const [screenLocked, setScreenLockedState] = useState(() => readStoredBool(STORAGE_KEYS.LYRICS_LOCK));

  const setFontScale = (next) => {
    const clamped = clampFontScale(next);
    setFontScaleState(clamped);
    try {
      localStorage.setItem(STORAGE_KEYS.LYRICS_FONT_SCALE, String(clamped));
    } catch { /* ignore */ }
  };
  const setFocusMode = (next) => {
    setFocusModeState(Boolean(next));
    try {
      localStorage.setItem(STORAGE_KEYS.LYRICS_FOCUS_MODE, next ? '1' : '0');
    } catch { /* ignore */ }
  };
  const setScreenLocked = (next) => {
    setScreenLockedState(Boolean(next));
    try {
      localStorage.setItem(STORAGE_KEYS.LYRICS_LOCK, next ? '1' : '0');
    } catch { /* ignore */ }
  };

  // Ref panel lirik & chord (.song-lyrics-main) — dipakai untuk efek
  // mode panggung/fokus/lock.
  const lyricsPanelRef = React.useRef(null);

  // Mode tampilan diterapkan pada elemen panel lirik (bukan body) supaya
  // tidak menimpa tema global aplikasi.
  useEffect(() => {
    const panel = lyricsDisplayRef?.current;
    if (!panel) return;
    panel.classList.toggle('lyrics-focus-mode', focusMode);
    panel.classList.toggle('lyrics-screen-locked', screenLocked);
  }, [lyricsDisplayRef, focusMode, screenLocked, loading]);

  return (
    <div className="song-panel song-lyrics-main" ref={lyricsPanelRef}>
      <SongChordsLyricsToolbar
        originalKey={originalKey}
        targetKey={targetKey}
        transpose={transpose}
        setTranspose={setTranspose}
        pianoRecommendation={pianoRecommendation}
        onApplyRecommendedTranspose={onApplyRecommendedTranspose}
        tempo={tempo}
        onTempoChange={onTempoChange}
        isMetronomeActive={isMetronomeActive}
        setIsMetronomeActive={setIsMetronomeActive}
        timeSignature={timeSignature}
        autoScrollActive={autoScrollActive}
        setAutoScrollActive={setAutoScrollActive}
        scrollSpeed={scrollSpeed}
        setScrollSpeed={setScrollSpeed}
        autoScrollMode={autoScrollMode}
        setAutoScrollMode={setAutoScrollMode}
        manualSpeedLevel={manualSpeedLevel}
        setManualSpeedLevel={setManualSpeedLevel}
        fontScale={fontScale}
        setFontScale={setFontScale}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
        screenLocked={screenLocked}
        setScreenLocked={setScreenLocked}
        setlistNav={setlistNav}
      />

        {loading ? (
            <div className="lyrics-loading-skeleton">
              <div className="skeleton-line" style={{ width: '80%' }} />
              <div className="skeleton-line" style={{ width: '90%' }} />
              <div className="skeleton-line" style={{ width: '70%' }} />
              <div className="skeleton-line" style={{ width: '60%' }} />
              <div className="skeleton-line" style={{ width: '85%' }} />
            </div>
          ) : (
            <SongChordsLyricsDisplay
              lyricsDisplayRef={lyricsDisplayRef}
              song={song}
              tempo={tempo}
              transpose={transpose}
              setTranspose={setTranspose}
              showChords={showChords}
              zoom={zoom}
              setZoom={setZoom}
              showChordNumbers={showChordNumbers}
              showJazzChords={showJazzChords}
              showSimpleChords={showSimpleChords}
              keySignature={keySignature}
              autoScrollActive={autoScrollActive}
              scrollSpeed={scrollSpeed}
              setAutoScrollActive={setAutoScrollActive}
              showSheetMusic={showSheetMusic}
              setShowSheetMusic={setShowSheetMusic}
              youtubeRef={youtubeRef}
              youtubeId={youtubeId}
              isYoutubePlaying={isYoutubePlaying}
              timeSignature={timeSignature}
              originalKey={originalKey}
              targetKey={targetKey}
              fontScale={fontScale}
              focusMode={focusMode}
              screenLocked={screenLocked}
              setlistNav={setlistNav}
              overlayMode={overlayMode}
              onOverlayClose={onOverlayClose}
            />
        )}
    </div>
  );
}
