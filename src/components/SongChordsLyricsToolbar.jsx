import React from 'react';
import AutoScrollControl from './AutoScrollControl.jsx';
import { AUTO_SCROLL_MODES, normalizeAutoScrollMode } from '../utils/autoscrollSpeedUtils.js';

/**
 * SongChordsLyricsToolbar
 * Toolbar panel lirik/chord: autoscroll lirik (on/off + mode Musik/Manual +
 * kecepatan), kontrol tampilan panggung (font size, mode fokus, lock layar).
 *
 * Kontrol transpose key & tempo dihapus dari toolbar: tersedia di header lagu
 * dan panel media. Kontrol lama lain (gaya chord, YouTube) juga sudah dihapus.
 */
export default function SongChordsLyricsToolbar({
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
  focusMode = false,
  setFocusMode,
  screenLocked = false,
  setScreenLocked,
  // Tempo (dipakai indikator autoscroll musik saja)
  tempo,
}) {
  const MIN_FONT_SCALE = 0.85;
  const MAX_FONT_SCALE = 2.5;
  const clampFontScale = (value) => Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Number(value) || 1));

  const autoScrollMode = normalizeAutoScrollMode(autoScrollModeProp || AUTO_SCROLL_MODES.MUSICAL);

  return (
    <div className="song-lyrics-toolbar song-lyrics-toolbar--normal">
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
