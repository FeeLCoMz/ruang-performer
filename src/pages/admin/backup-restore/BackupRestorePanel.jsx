/**
 * BackupRestorePanel.jsx
 *
 * Panel Backup & Restore database, ditampilkan di tab Backup halaman
 * Administrator (/admin#backup). Fitur administrator default: selalu aktif,
 * bukan modul. Rute lama /backup-restore dialihkan ke tab ini.
 *
 * Backup adalah tindakan aman; Restore menimpa seluruh database sehingga
 * ditempatkan di zona berisiko dan baru aktif setelah admin mengetik kata
 * konfirmasi. Ini mencegah satu klik keliru menghapus data produksi.
 */
import React, { useState } from 'react';
import { useSqlBackup } from './useSqlBackup.js';
import { useSqlRestore } from './useSqlRestore.js';

const RESTORE_CONFIRMATION = 'RESTORE';

function formatBackupTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupRestorePanel({ withHeading = false }) {
  const { backingUp, backupError, backupSuccess, handleBackup, lastBackup } = useSqlBackup();
  const { restoring, restoreError, restoreSuccess, sqlInputRef, handleRestore } = useSqlRestore();
  const [confirmation, setConfirmation] = useState('');

  const restoreUnlocked = confirmation.trim().toUpperCase() === RESTORE_CONFIRMATION;

  const pickSqlFile = () => {
    if (!restoreUnlocked || !sqlInputRef.current) return;
    sqlInputRef.current.click();
  };

  const onFileSelected = (event) => {
    handleRestore(event);
    setConfirmation('');
  };

  return (
    <>
      {withHeading && <h2 className="admin-section-title" id="admin-backup">Backup &amp; Restore Database</h2>}
      <div className="card admin-panel" id={withHeading ? undefined : 'admin-backup'}>
        <h3 className="admin-panel-subtitle">💾 Backup</h3>
        <div className="admin-backup-form">
          <button className="btn btn-primary" onClick={handleBackup} disabled={backingUp}>
            {backingUp ? 'Backing up...' : '💾 Backup Database (SQL)'}
          </button>
        </div>
        <p className="admin-muted">
          Mengunduh seluruh database ke file .sql. Tindakan ini aman dan tidak
          mengubah data.
        </p>
        <div className="admin-last-backup">
          <span className="admin-last-backup-label">Backup terakhir di perangkat ini</span>
          {lastBackup ? (
            <span className="admin-last-backup-value">
              {formatBackupTime(lastBackup.at)} · {formatBytes(lastBackup.bytes)}
              <span className="admin-last-backup-file">{lastBackup.filename}</span>
            </span>
          ) : (
            <span className="admin-last-backup-value is-empty">Belum ada backup dari perangkat ini.</span>
          )}
          <span className="admin-last-backup-note">
            Catatan disimpan di browser ini, bukan di server.
          </span>
        </div>
        {backupError && <div className="admin-panel-banner is-error">{backupError}</div>}
        {backupSuccess && <div className="admin-panel-banner is-success">{backupSuccess}</div>}
      </div>

      <div className="card admin-panel admin-danger-zone">
        <h3 className="admin-panel-subtitle">♻️ Restore Database</h3>
        <div className="admin-danger-warning" role="note">
          <strong>Perhatian:</strong> restore menimpa <em>seluruh</em> data saat ini
          dengan isi file backup dan tidak dapat dibatalkan. Pastikan sudah membuat
          backup terbaru.
        </div>

        <label className="admin-danger-confirm">
          <span className="admin-danger-confirm-text">
            Ketik <code>{RESTORE_CONFIRMATION}</code> untuk mengaktifkan tombol restore
          </span>
          <input
            type="text"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={RESTORE_CONFIRMATION}
            aria-label="Kata konfirmasi restore"
            disabled={restoring}
            autoComplete="off"
          />
        </label>

        <div className="admin-backup-form">
          <input
            type="file"
            accept=".sql,text/sql"
            className="tools-hidden-input"
            ref={sqlInputRef}
            onChange={onFileSelected}
            disabled={restoring || !restoreUnlocked}
          />
          <button
            type="button"
            className="btn btn-danger"
            onClick={pickSqlFile}
            disabled={restoring || !restoreUnlocked}
          >
            {restoring ? 'Restoring...' : '♻️ Restore dari file SQL'}
          </button>
        </div>
        {!restoreUnlocked && (
          <p className="admin-muted">Tombol restore terkunci sampai konfirmasi diisi.</p>
        )}
        {restoreError && <div className="admin-panel-banner is-error">{restoreError}</div>}
        {restoreSuccess && <div className="admin-panel-banner is-success">{restoreSuccess}</div>}
      </div>
    </>
  );
}
