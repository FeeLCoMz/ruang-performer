/**
 * BackupRestorePanel.jsx
 *
 * Panel Backup & Restore database di halaman Administrator. Dipakai juga oleh
 * halaman /backup-restore agar tidak ada duplikasi markup. Fitur administrator
 * default: selalu aktif, bukan modul.
 */
import React from 'react';
import { useSqlBackup } from './useSqlBackup.js';
import { useSqlRestore } from './useSqlRestore.js';

export default function BackupRestorePanel({ withHeading = false }) {
  const { backingUp, backupError, backupSuccess, handleBackup } = useSqlBackup();
  const { restoring, restoreError, restoreSuccess, sqlInputRef, handleRestore } = useSqlRestore();

  return (
    <>
      {withHeading && <h2 className="admin-section-title" id="admin-backup">Backup &amp; Restore Database</h2>}
      <div className="card admin-panel" id={withHeading ? undefined : 'admin-backup'}>
        <div className="admin-backup-form">
          <button className="btn btn-primary" onClick={handleBackup} disabled={backingUp}>
            {backingUp ? 'Backing up...' : '💾 Backup Database (SQL)'}
          </button>
          <input
            type="file"
            accept=".sql,text/sql"
            className="tools-hidden-input"
            ref={sqlInputRef}
            onChange={handleRestore}
            disabled={restoring}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => sqlInputRef.current && sqlInputRef.current.click()}
            disabled={restoring}
          >
            {restoring ? 'Restoring...' : '♻️ Restore dari file SQL'}
          </button>
        </div>
        <p className="admin-muted">
          Restore akan menimpa seluruh data saat ini dengan isi file backup.
        </p>
        {backupError && <div className="admin-panel-banner is-error">{backupError}</div>}
        {backupSuccess && <div className="admin-panel-banner is-success">{backupSuccess}</div>}
        {restoreError && <div className="admin-panel-banner is-error">{restoreError}</div>}
        {restoreSuccess && <div className="admin-panel-banner is-success">{restoreSuccess}</div>}
      </div>
    </>
  );
}
