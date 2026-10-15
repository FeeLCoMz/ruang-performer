import React from 'react';
import TransposeKeyControl from './TransposeKeyControl.jsx';
import AutoScrollControl from './AutoScrollControl.jsx';
import TempoControl from './TempoControl.jsx';
import { AUTO_SCROLL_MODES, normalizeAutoScrollMode } from '../utils/autoscrollSpeedUtils.js';

/**
 * SongChordsLyricsToolbar
 * Toolbar panel lirik/chord: key/transpose + LED tempo, autoscroll lirik
 * (on/off + mode Musik/Manual + kecepatan), kontrol tampilan panggung
 * (font size, mode panggung, mode fokus, lock layar), dan navigasi lagu
 * setlist.
 *
 * Kontrol lama lain (gaya chord, YouTube) dihapus dari toolbar: tersedia di
 * panel media dan kontrol fullscreen perf.
 */
export default function SongChordsLyricsToolbar({
  // Key & tempo
  originalKey = '',
  targetKey = '',
  transpose = 0,
  setTranspose,
  tempo,
  // Autoscroll lirik
  autoScrollActive = false,
  setAutoScrollActive,
  scrollSpeed,
  setScrollSpeed,
  autoScrollMode: autoScrollModeProp,
  setAutoScrollMode,
  manualSpeedLevel: manualSpeedLevelProp,
  setManualSpeedLevel,  // Grup tampilan panggung: font, mode panggung, mode fokus, lock
  fontScale = 1,
  setFontScale,
  pianoRecommendation = null,
  onApplyRecommendedTranspose,
  focusMode = false,
  setFocusMode,
  screenLocked = false,
  setScreenLocked,
  // Tempo & metronome
  onTempoChange,
  isMetronomeActive = false,
  setIsMetronomeActive,
  timeSignature = '4/4',
  // Navigasi setlist (opsional — hanya di konteks setlist)
  setlistNav = null,
}) {
  const MIN_FONT_SCALE = 0.85;
  const MAX_FONT_SCALE = 2.5;
  const clampFontScale = (value) => Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Number(value) || 1));

  const baseTempo = Math.max(40, Math.min(240, Number(tempo) || 120));
  const autoScrollMode = normalizeAutoScrollMode(autoScrollModeProp || AUTO_SCROLL_MODES.MUSICAL);

  return (
    <div className="song-lyrics-toolbar song-lyrics-toolbar--normal">
      {/* Transpose key — kapsul compact */}
      <TransposeKeyControl
        originalKey={originalKey}
        targetKey={targetKey}
        transpose={transpose}
        onTransposeChange={(next) => setTranspose?.(Number(next) || 0)}
        variant="compact"
        disableAutoApply
        pianoRecommendation={pianoRecommendation}
        onApplyRecommendedTranspose={onApplyRecommendedTranspose}
      />

      {/* Tempo & metronome — shared TempoControl compact */}
      {onTempoChange ? (
        <TempoControl
          tempo={tempo}
          scrollSpeed={scrollSpeed}
          setScrollSpeed={setScrollSpeed}
          isMetronomeActive={isMetronomeActive}
          setIsMetronomeActive={setIsMetronomeActive}
          timeSignature={timeSignature}
          variant="compact"
        />
      ) : (
        <div
          className="song-lyrics-tempo-led-compact"
          title={`Tempo ${baseTempo} BPM`}
        >
          <span
            className="song-info-tempo-led"
            style={{ animationDuration: `${Math.round(60000 / baseTempo)}ms` }}
            aria-hidden="true"
          />
          <span className="song-lyrics-tempo-led-compact-text" aria-live="polite">
            {baseTempo}
          </span>
        </div>
      )}

      {/* Autoscroll lirik — shared AutoScrollControl */}
      <AutoScrollControl
        autoScrollActive={autoScrollActive}
        setAutoScrollActive={setAutoScrollActive}
        scrollSpeed={scrollSpeed}
        setScrollSpeed={setScrollSpeed}
        autoScrollMode={autoScrollMode}
        setAutoScrollMode={setAutoScrollMode}
        manualSpeedLevel={manualSpeedLevelProp}
        setManualSpeedLevel={setManualSpeedLevel}
        tempo={tempo}
      />

      {/* Grup tampilan: font size, mode fokus, lock layar */}
      <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-viewmode" role="group" aria-label="Tampilan lirik">
        <div className="song-lyrics-font-control" role="group" aria-label="Ukuran font lirik">
          <button
            type="button"
            className="btn btn-secondary song-lyrics-font-btn"
            onClick={() => setFontScale?.(clampFontScale(Number(fontScale) - 0.1))}
            disabled={Number(fontScale) <= MIN_FONT_SCALE || typeof setFontScale !== 'function'}
            aria-label="Perkecil font lirik"
            title="Perkecil font lirik"
          >
            A−
          </button>
          <span
            className="song-lyrics-font-value"
            aria-live="polite"
            title="Ukuran font lirik"
          >
            {Math.round(Number(fontScale) * 100)}%
          </span>
          <button
            type="button"
            className="btn btn-secondary song-lyrics-font-btn"
            onClick={() => setFontScale?.(clampFontScale(Number(fontScale) + 0.1))}
            disabled={Number(fontScale) >= MAX_FONT_SCALE || typeof setFontScale !== 'function'}
            aria-label="Perbesar font lirik"
            title="Perbesar font lirik"
          >
            A+
          </button>
        </div>
        <button
          type="button"
          className={`btn song-lyrics-toolbar-btn${focusMode ? ' btn-primary' : ' btn-secondary'}`}
          onClick={() => setFocusMode?.(!focusMode)}
          aria-pressed={focusMode}
          aria-label={focusMode ? 'Matikan mode fokus' : 'Nyalakan mode fokus'}
          title={focusMode ? 'Mode fokus aktif: baris aktif disorot' : 'Mode fokus: sorot bagian aktif lirik'}
        >
          <span aria-hidden="true">🎯</span>
          <span className="song-lyrics-toolbar-btn-label">Fokus</span>
        </button>
        <button
          type="button"
          className={`btn song-lyrics-toolbar-btn${screenLocked ? ' btn-primary' : ' btn-secondary'}`}
          onClick={() => setScreenLocked?.(!screenLocked)}
          aria-pressed={screenLocked}
          aria-label={screenLocked ? 'Buka kunci layar' : 'Kunci layar'}
          title={screenLocked ? 'Layar terkunci: sentuhan tak sengaja diabaikan' : 'Kunci layar: cegah sentuhan tak sengaja'}
        >
          <span aria-hidden="true">{screenLocked ? '🔒' : '🔓'}</span>
          <span className="song-lyrics-toolbar-btn-label">{screenLocked ? 'Terkunci' : 'Kunci'}</span>
        </button>
      </div>

      {/* Navigasi setlist dipindah ke SetlistNavFooter (sticky footer di atas
          bottom nav, mobile) — lihat SetlistNavFooter.jsx */}
    </div>
  );
}
