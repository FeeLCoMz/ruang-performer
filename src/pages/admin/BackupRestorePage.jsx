/**
 * BackupRestorePage.jsx
 *
 * Halaman Backup & Restore Database (role admin/owner) — fitur administrator
 * default, bukan modul: selalu aktif dan tidak punya toggle on/off.
 *
 * Halaman ini tetap ada untuk akses langsung (/backup-restore); isi utamanya
 * juga tersedia di halaman Administrator (/admin).
 */
import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { isAppAdmin } from '../../utils/adminAccess.js';
import { useSqlBackup } from './backup-restore/useSqlBackup.js';
import { useSqlRestore } from './backup-restore/useSqlRestore.js';

export default function BackupRestorePage() {
  const { user } = useAuth();
  const { backingUp, backupError, backupSuccess, handleBackup } = useSqlBackup();
  const { restoring, restoreError, restoreSuccess, sqlInputRef, handleRestore } = useSqlRestore();

  if (!isAppAdmin(user)) {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Backup & Restore</h1></div>
        <div className="card">Hanya Administrator aplikasi yang dapat mengakses halaman ini.</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>💾 Backup & Restore</h1>
          <p>Backup seluruh database ke file SQL, atau pulihkan dari backup sebelumnya.</p>
        </div>
      </div>

      <div className="card tools-grid">
        <div className="tool-card">
          <h2>💾 Backup Database</h2>
          <p>Backup seluruh database ke file SQL (dump). Cocok untuk restore manual atau migrasi ke server lain.</p>
          <button className="btn btn-primary" onClick={handleBackup} disabled={backingUp}>{backingUp ? 'Backing up...' : 'Backup SQL'}</button>
          {backupError && <div className="tools-feedback tools-feedback-error">{backupError}</div>}
          {backupSuccess && <div className="tools-feedback tools-feedback-success">{backupSuccess}</div>}
        </div>

        <div className="tool-card">
          <h2>♻️ Restore Database SQL</h2>
          <p>Restore database dari file SQL backup. <b>Seluruh data lama akan dihapus!</b></p>
          <input type="file" accept=".sql,text/sql" className="tools-hidden-input" ref={sqlInputRef} onChange={handleRestore} disabled={restoring} />
          <button className="btn btn-primary" onClick={() => sqlInputRef.current && sqlInputRef.current.click()} disabled={restoring}>{restoring ? 'Restoring...' : 'Restore SQL'}</button>
          {restoreError && <div className="tools-feedback tools-feedback-error">{restoreError}</div>}
          {restoreSuccess && <div className="tools-feedback tools-feedback-success">{restoreSuccess}</div>}
        </div>
      </div>
    </div>
  );
}
