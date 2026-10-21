/**
 * BackupRestorePage.jsx
 *
 * Halaman Backup & Restore Database (role admin/owner) — fitur administrator
 * default, bukan modul: selalu aktif dan tidak punya toggle on/off.
 *
 * Halaman ini tetap ada untuk akses langsung (/backup-restore); isi utamanya
 * memakai `BackupRestorePanel` yang sama dengan halaman Administrator.
 */
import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { isAppAdmin } from '../../utils/adminAccess.js';
import BackupRestorePanel from './backup-restore/BackupRestorePanel.jsx';

export default function BackupRestorePage() {
  const { user } = useAuth();

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

      <BackupRestorePanel />
    </div>
  );
}
