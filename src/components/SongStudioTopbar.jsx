import React from 'react';
/**
 * SongStudioTopbar
 *
 * The sticky command bar from the studio layout: a way out on the left, what you
 * are editing in the middle, and the save action on the right - so the primary
 * action is reachable without scrolling to the bottom of a long form.
 *
 * Status (dirty / saving / blocked) rides along the middle instead of taking a
 * row of its own, and the field-error blocker stays clickable because a disabled
 * save button with no explanation is the one thing a user cannot recover from.
 */
export default function SongStudioTopbar({
  modeLabel,
  title,
  eyebrowIcon,
  isEditMode,
  newVersionMode,
  loading,
  hasFieldErrors,
  hasUnsavedChanges,
  statusText,
  onCancel,
  onFixFields,
}) {
  const saveLabel = loading
    ? '⏳ Menyimpan...'
    : isEditMode
      ? '💾 Simpan'
      : newVersionMode
        ? '🧬 Simpan Versi'
        : '💾 Simpan';

  return (
    <div className="studio-topbar">
      <button type="button" onClick={onCancel} className="btn btn-secondary studio-topbar-back">
        ← Batal
      </button>

      <div className="studio-topbar-title">
        <span className="studio-topbar-icon" aria-hidden="true">{eyebrowIcon}</span>
        <div className="studio-topbar-title-text">
          <span className="studio-topbar-heading">{modeLabel}</span>
          <span className="studio-topbar-subject">{title}</span>
        </div>
      </div>

      <div className="studio-topbar-status">
        <span
          className={`song-editor-status-dot${loading ? ' is-saving' : hasUnsavedChanges ? ' is-dirty' : ' is-clean'}`}
          aria-hidden="true"
        />
        <span className={`song-editor-status${loading ? ' is-saving' : hasUnsavedChanges ? ' is-dirty' : ' is-clean'}`}>
          {statusText}
        </span>
        {hasFieldErrors && !loading && (
          <button
            type="button"
            className="song-editor-status-blocker"
            onClick={onFixFields}
            title="Perbaiki Key / Tempo / Time Signature"
          >
            ⚠ Perbaiki
          </button>
        )}
      </div>

      <div className="studio-topbar-actions">
        <button
          type="submit"
          disabled={loading || hasFieldErrors}
          className="btn btn-primary studio-topbar-save"
          title={hasFieldErrors ? 'Perbaiki Key, Tempo, atau Time Signature dulu' : undefined}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
