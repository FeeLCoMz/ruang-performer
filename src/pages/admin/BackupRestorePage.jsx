/**
 * BackupRestorePage.jsx
 *
 * Halaman Backup & Restore Database (khusus Owner) — bagian dari
 * direktori `pages/admin` bersama halaman Administrator lainnya.
 *
 * Sebelumnya bagian dari ToolsPage; sekarang mandiri supaya bisa
 * diaktifkan/dinonaktifkan dari halaman Admin.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useBackupRestoreEnabled } from '../../modules/backup-restore/useBackupRestoreEnabled.js';
import { useSqlBackup } from '../../modules/backup-restore/useSqlBackup.js';
import { useSqlRestore } from '../../modules/backup-restore/useSqlRestore.js';

export default function BackupRestorePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enabled] = useBackupRestoreEnabled();
  const { backingUp, backupError, backupSuccess, handleBackup } = useSqlBackup();
  const { restoring, restoreError, restoreSuccess, sqlInputRef, handleRestore } = useSqlRestore();

  if (!user || user.role !== 'owner') {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Backup & Restore</h1></div>
        <div className="card">Hanya Owner aplikasi yang dapat mengakses halaman ini.</div>
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

      {!enabled && (
        <div className="ct-banner ct-banner-warn" role="status">
          Modul ini sedang dinonaktifkan.{' '}
          <button type="button" className="btn btn-secondary ct-link-btn" onClick={() => navigate('/admin')}>
            Aktifkan di halaman Admin
          </button>
        </div>
      )}

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
