/**
 * useSqlBackup.js
 *
 * State + handler untuk backup database ke file .sql.
 * Dipindah dari ToolsPage agar modul Backup & Restore mandiri.
 */
import { useState } from 'react';
import * as apiClient from '../../apiClient.js';

export function useSqlBackup() {
  const [backingUp, setBackingUp] = useState(false);
  const [backupError, setBackupError] = useState(null);
  const [backupSuccess, setBackupSuccess] = useState(null);

  const handleBackup = async () => {
    setBackingUp(true);
    setBackupError(null);
    setBackupSuccess(null);
    try {
      const sqlText = await apiClient.backupDatabase();
      if (!sqlText || !sqlText.trim()) throw new Error('Backup gagal: tidak ada data SQL');
      const blob = new Blob([sqlText], { type: 'text/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ruang-performer-db-backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupSuccess('Backup database berhasil!');
    } catch (e) {
      setBackupError('Backup gagal: ' + (e.message || e));
    }
    setBackingUp(false);
  };

  return { backingUp, backupError, backupSuccess, handleBackup };
}

export default useSqlBackup;
