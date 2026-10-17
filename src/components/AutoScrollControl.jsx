import React, { useState } from 'react';
import {
  AUTO_SCROLL_MODES,
  normalizeAutoScrollMode,
  clampManualSpeedLevel,
  MIN_MANUAL_SPEED_LEVEL,
  MAX_MANUAL_SPEED_LEVEL,
  DEFAULT_MANUAL_SPEED_LEVEL,
} from '../utils/autoscrollSpeedUtils.js';

/**
 * AutoScrollControl
 * Shared komponen grup kontrol autoscroll lirik:
 * - tombol on/off autoscroll
 * - mode Musik (BPM, mengikuti tempo lagu) / Manual (Level 1-10)
 * - kecepatan: tombol −/+ dan input numerik
 * - tombol reset ke tempo lagu / level default (muncul bila nilai menyimpang)
 *
 * Dipakai di SongChordsLyricsToolbar. State dikelola parent (lintas-tab di
 * SongChordsPage); komponen ini memakai fallback lokal bila parent belum
 * mengelola mode/level.
 */
export default function AutoScrollControl({
  autoScrollActive = false,
  setAutoScrollActive,
  scrollSpeed,
  setScrollSpeed,
  autoScrollMode: autoScrollModeProp,
  setAutoScrollMode,
  manualSpeedLevel: manualSpeedLevelProp,
  setManualSpeedLevel,
  tempo = 120,
  // size: 'normal' | 'mini' — mini untuk bar terpadu mode penuh
  size = 'normal',
}) {
  // Fallback lokal bila parent belum mengelola mode/level.
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
    /* Satu div/kapsul: tombol autoscroll + mode + kecepatan menyatu. */
    <div
      className={`song-lyrics-autoscroll-capsule${autoScrollActive ? ' is-active' : ''}${isManualMode ? ' is-manual' : ''}${size === 'mini' ? ' song-lyrics-autoscroll-capsule-mini' : ''}`}
      role="group"
      aria-label="Autoscroll lirik"
    >
      <button
        type="button"
        className={`song-lyrics-autoscroll-toggle${autoScrollActive ? ' is-active' : ''}`}
        onClick={() => setAutoScrollActive?.(!autoScrollActive)}
        title={autoScrollActive ? 'Matikan autoscroll' : 'Nyalakan autoscroll'}
        aria-label={autoScrollActive ? 'Matikan autoscroll' : 'Nyalakan autoscroll'}
        aria-pressed={autoScrollActive}
      >
        <span aria-hidden="true">↕</span>
        <span className="song-lyrics-autoscroll-btn-label">Scroll</span>
      </button>

      <button
        type="button"
        className="song-lyrics-autoscroll-mode"
        onClick={() => setAutoScrollModeSafe(isManualMode ? AUTO_SCROLL_MODES.MUSICAL : AUTO_SCROLL_MODES.MANUAL)}
        aria-label={`Mode autoscroll: ${isManualMode ? 'Manual (Level)' : 'Musik (BPM)'}. Klik untuk ganti.`}
        title={isManualMode ? 'Mode Manual: kecepatan dari level (1-10)' : 'Mode Musik: kecepatan mengikuti tempo lagu (BPM)'}
      >
        <span aria-hidden="true">{isManualMode ? '≡' : '♪'}</span>
        <span className="song-lyrics-autoscroll-btn-label">{isManualMode ? 'Manual' : 'Musik'}</span>
      </button>

      <button
        type="button"
        className="song-lyrics-autoscroll-step"
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

      <span className="song-lyrics-autoscroll-value" aria-live="polite">
        {isManualMode ? manualSpeedLevel : currentScrollSpeed}
        {size !== 'mini' && (
          <span className="song-lyrics-autoscroll-unit" aria-hidden="true">{isManualMode ? 'Level' : 'BPM'}</span>
        )}
      </span>

      <button
        type="button"
        className="song-lyrics-autoscroll-step"
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

      {(isManualMode ? manualSpeedLevel !== DEFAULT_MANUAL_SPEED_LEVEL : currentScrollSpeed !== baseTempo) && (
        <button
          type="button"
          className="song-lyrics-autoscroll-reset"
          onClick={() => {
            if (isManualMode) setManualSpeedLevelSafe(DEFAULT_MANUAL_SPEED_LEVEL);
            else setScrollSpeedClamped(baseTempo);
          }}
          title={isManualMode
            ? `Kembalikan ke level default (${DEFAULT_MANUAL_SPEED_LEVEL})`
            : `Kembalikan ke tempo lagu (${baseTempo} BPM)`}
          aria-label={isManualMode ? `Reset ke level default ${DEFAULT_MANUAL_SPEED_LEVEL}` : `Reset ke tempo lagu ${baseTempo} BPM`}
        >
          ⟲
        </button>
      )}
    </div>
  );
}
