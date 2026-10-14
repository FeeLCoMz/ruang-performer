import React, { useState } from 'react';
import TransposeKeyControl from './TransposeKeyControl.jsx';
import {
  AUTO_SCROLL_MODES,
  normalizeAutoScrollMode,
  clampManualSpeedLevel,
  MIN_MANUAL_SPEED_LEVEL,
  MAX_MANUAL_SPEED_LEVEL,
  DEFAULT_MANUAL_SPEED_LEVEL,
} from '../utils/autoscrollSpeedUtils.js';

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
  setManualSpeedLevel,
  // Grup tampilan panggung: font, mode panggung, mode fokus, lock
  fontScale = 1,
  setFontScale,
  stageMode = false,
  setStageMode,
  focusMode = false,
  setFocusMode,
  screenLocked = false,
  setScreenLocked,
  // Navigasi setlist (opsional — hanya di konteks setlist)
  setlistNav = null,
}) {
  const MIN_FONT_SCALE = 0.85;
  const MAX_FONT_SCALE = 1.6;
  const clampFontScale = (value) => Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Number(value) || 1));

  // Autoscroll: fallback lokal bila parent belum kelola mode/level.
  const [autoScrollModeLocal, setAutoScrollModeLocal] = useState(AUTO_SCROLL_MODES.MUSICAL);
  const [manualSpeedLevelLocal, setManualSpeedLevelLocal] = useState(DEFAULT_MANUAL_SPEED_LEVEL);
  const autoScrollMode = normalizeAutoScrollMode(autoScrollModeProp || autoScrollModeLocal);
  const setAutoScrollModeSafe = setAutoScrollMode || setAutoScrollModeLocal;
  const manualSpeedLevel = clampManualSpeedLevel(manualSpeedLevelProp || manualSpeedLevelLocal);
  const setManualSpeedLevelSafe = setManualSpeedLevel || setManualSpeedLevelLocal;
  const isManualMode = autoScrollMode === AUTO_SCROLL_MODES.MANUAL;

  const baseTempo = Math.max(40, Math.min(240, Number(tempo) || 120));
  const currentScrollSpeed = Math.max(40, Math.min(240, Number(scrollSpeed) || baseTempo));

  const setScrollSpeedClamped = (next) => {
    if (typeof setScrollSpeed !== 'function') return;
    const numeric = Number(next);
    if (!Number.isFinite(numeric)) return;
    setScrollSpeed(Math.max(40, Math.min(240, Math.round(numeric))));
  };

  return (
    <div className="song-lyrics-toolbar song-lyrics-toolbar--normal">
      {/* Key/Transpose — grup mandiri, langsung di baris utama (akses cepat) */}
      <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-key" role="group" aria-label="Transpose key">
        <TransposeKeyControl
          originalKey={originalKey}
          targetKey={targetKey}
          transpose={transpose}
          onTransposeChange={(next) => setTranspose?.(Number(next) || 0)}
          compact
          disableAutoApply
        />
      </div>

      {/* LED tempo — elemen mandiri (read-only info) */}
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

      {/* Autoscroll lirik: on/off + mode Musik (BPM) / Manual (Level 1-10) */}
      <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-autoscroll" role="group" aria-label="Autoscroll lirik">
        <button
          type="button"
          className={`btn song-lyrics-toolbar-btn ${autoScrollActive ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setAutoScrollActive?.(!autoScrollActive)}
          title={autoScrollActive ? 'Matikan autoscroll' : 'Nyalakan autoscroll'}
          aria-label={autoScrollActive ? 'Matikan autoscroll' : 'Nyalakan autoscroll'}
          aria-pressed={autoScrollActive}
        >
          <span aria-hidden="true">↕</span>
          <span className="song-lyrics-toolbar-btn-label">Autoscroll</span>
        </button>

        <div className="song-lyrics-autoscroll-speed" role="group" aria-label="Kecepatan autoscroll">
          <button
            type="button"
            className={`btn btn-secondary song-lyrics-autoscroll-mode${isManualMode ? ' is-manual' : ''}`}
            onClick={() => setAutoScrollModeSafe(isManualMode ? AUTO_SCROLL_MODES.MUSICAL : AUTO_SCROLL_MODES.MANUAL)}
            aria-label={`Mode autoscroll: ${isManualMode ? 'Manual (Level)' : 'Musik (BPM)'}. Klik untuk ganti.`}
            title={isManualMode ? 'Mode Manual: kecepatan dari level (1-10)' : 'Mode Musik: kecepatan mengikuti tempo lagu (BPM)'}
          >
            <span aria-hidden="true">{isManualMode ? '≡' : '♪'}</span>
            <span className="song-lyrics-autoscroll-mode-label">{isManualMode ? 'Manual' : 'Musik'}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary song-lyrics-autoscroll-step"
            onClick={() => {
              if (isManualMode) {
                setManualSpeedLevelSafe(clampManualSpeedLevel(manualSpeedLevel - 1));
                return;
              }
              setScrollSpeedClamped(currentScrollSpeed - 1);
            }}
            disabled={isManualMode ? manualSpeedLevel <= MIN_MANUAL_SPEED_LEVEL : currentScrollSpeed <= 40}
            aria-label={isManualMode ? 'Kurangi level kecepatan autoscroll 1' : 'Kurangi kecepatan autoscroll 1 BPM'}
            title={isManualMode ? '-1 Level' : '-1 BPM'}
          >
            −
          </button>
          <input
            type="number"
            className="song-lyrics-autoscroll-input"
            value={isManualMode ? manualSpeedLevel : currentScrollSpeed}
            min={isManualMode ? MIN_MANUAL_SPEED_LEVEL : 40}
            max={isManualMode ? MAX_MANUAL_SPEED_LEVEL : 240}
            step={1}
            inputMode="numeric"
            onChange={(e) => {
              if (isManualMode) {
                setManualSpeedLevelSafe(clampManualSpeedLevel(e.target.value));
                return;
              }
              setScrollSpeedClamped(e.target.value);
            }}
            aria-label={isManualMode ? 'Level kecepatan autoscroll (1-10)' : 'Kecepatan autoscroll (BPM)'}
            title={isManualMode ? 'Level kecepatan autoscroll (1-10)' : 'Kecepatan autoscroll dalam BPM'}
          />
          <span className="song-lyrics-autoscroll-unit" aria-hidden="true">{isManualMode ? 'Lv' : 'BPM'}</span>
          <button
            type="button"
            className="btn btn-secondary song-lyrics-autoscroll-step"
            onClick={() => {
              if (isManualMode) {
                setManualSpeedLevelSafe(clampManualSpeedLevel(manualSpeedLevel + 1));
                return;
              }
              setScrollSpeedClamped(currentScrollSpeed + 1);
            }}
            disabled={isManualMode ? manualSpeedLevel >= MAX_MANUAL_SPEED_LEVEL : currentScrollSpeed >= 240}
            aria-label={isManualMode ? 'Tambah level kecepatan autoscroll 1' : 'Tambah kecepatan autoscroll 1 BPM'}
            title={isManualMode ? '+1 Level' : '+1 BPM'}
          >
            +
          </button>
          {isManualMode ? (
            manualSpeedLevel !== DEFAULT_MANUAL_SPEED_LEVEL && (
              <button
                type="button"
                className="btn btn-secondary song-lyrics-autoscroll-reset"
                onClick={() => setManualSpeedLevelSafe(DEFAULT_MANUAL_SPEED_LEVEL)}
                title={`Kembalikan ke level default (${DEFAULT_MANUAL_SPEED_LEVEL})`}
                aria-label={`Reset ke level default ${DEFAULT_MANUAL_SPEED_LEVEL}`}
              >
                ⟲
              </button>
            )
          ) : (
            currentScrollSpeed !== baseTempo && (
              <button
                type="button"
                className="btn btn-secondary song-lyrics-autoscroll-reset"
                onClick={() => setScrollSpeedClamped(baseTempo)}
                title={`Kembalikan ke tempo lagu (${baseTempo} BPM)`}
                aria-label={`Reset ke tempo lagu ${baseTempo} BPM`}
              >
                ⟲
              </button>
            )
          )}
        </div>
      </div>

      {/* Grup tampilan: font size, mode panggung, mode fokus, lock layar */}
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
          className={`btn song-lyrics-toolbar-btn${stageMode ? ' btn-primary' : ' btn-secondary'}`}
          onClick={() => setStageMode?.(!stageMode)}
          aria-pressed={stageMode}
          aria-label={stageMode ? 'Matikan mode panggung' : 'Nyalakan mode panggung'}
          title={stageMode ? 'Mode panggung aktif: kontras tinggi & font besar' : 'Mode panggung: kontras tinggi untuk panggung redup'}
        >
          <span aria-hidden="true">🌙</span>
          <span className="song-lyrics-toolbar-btn-label">Panggung</span>
        </button>
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
