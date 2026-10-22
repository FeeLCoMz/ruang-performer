/**
 * Tombol Stage Mode di app header (mobile/tablet).
 *
 * Stage Mode menyalakan tema kontras tinggi (`body.stage-mode`) agar lirik dan
 * UI tetap terbaca di pencahayaan panggung yang redup. Preferensi dikelola di
 * AppContent dan dipersist di localStorage (STORAGE_KEYS.STAGE_MODE).
 *
 * Glif-nya inline SVG (bukan emoji) supaya seragam dengan ikon panggung
 * (StageShell) dan tajam di tema kontras tinggi.
 */
import React from 'react';
// Hanya gaya tombol (eager); gaya halaman panggung ada di stage-mode-page.css
// yang ikut chunk lazy StageModePage.
import './stage-mode-button.css';
import { useStageModeEnabled } from './useStageModeEnabled.js';

function StageMicGlyph() {
  return (
    <svg
      className="stage-mode-btn-icon"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </svg>
  );
}

export default function StageModeButton({ stageMode = false, onToggle }) {
  // Modul Stage Mode dimatikan dari halaman Modul: tombol tidak ditampilkan.
  const [moduleEnabled] = useStageModeEnabled();
  if (!moduleEnabled) return null;

  return (
    <button
      type="button"
      className={`stage-mode-btn${stageMode ? ' is-active' : ''}`}
      onClick={onToggle}
      aria-pressed={stageMode}
      aria-label={stageMode ? 'Matikan Stage Mode' : 'Nyalakan Stage Mode'}
      title={stageMode ? 'Stage Mode aktif — klik untuk keluar' : 'Stage Mode: tampilan panggung kontras tinggi'}
    >
      <StageMicGlyph />
      <span className="stage-mode-btn-label">Stage</span>
    </button>
  );
}
