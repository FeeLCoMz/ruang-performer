/**
 * Tombol Stage Mode di app header (mobile/tablet).
 *
 * Stage Mode menyalakan tema kontras tinggi (`body.stage-mode`) agar lirik dan
 * UI tetap terbaca di pencahayaan panggung yang redup. Preferensi dikelola di
 * AppContent dan dipersist di localStorage (STORAGE_KEYS.STAGE_MODE).
 */
export default function StageModeButton({ stageMode = false, onToggle }) {
  return (
    <button
      type="button"
      className={`btn stage-mode-btn${stageMode ? ' active btn-primary' : ' btn-secondary'}`}
      onClick={onToggle}
      aria-pressed={stageMode}
      aria-label={stageMode ? 'Matikan Stage Mode' : 'Nyalakan Stage Mode'}
      title={stageMode ? 'Stage Mode aktif: kontras tinggi untuk panggung' : 'Stage Mode: kontras tinggi untuk panggung'}
    >
      <span className="stage-mode-btn-icon" aria-hidden="true">🎤</span>
      <span className="stage-mode-btn-label">Stage Mode</span>
    </button>
  );
}
