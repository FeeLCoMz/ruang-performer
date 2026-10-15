import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as apiClient from '../apiClient.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getToken, getAuthHeader } from '../utils/auth.js';
// No permission check needed, just check user.role === 'owner'

// --- Hooks dipisah dari komponen supaya urutan hook selalu konsisten ---
// (rules of hooks: tidak boleh ada hook setelah early return owner guard).
function useOwnerAuth() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  React.useEffect(() => {
    async function syncUser() {
      if (!user || user.role !== 'owner') {
        try {
          const res = await apiClient.getCurrentUser();
          if (res && res.user && res.user.role === 'owner') {
            login(getToken(), res.user);
          }
        } catch { /* ignore */ }
      }
    }
    syncUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { user, navigate };
}

// State + handler restore SQL (dipisah agar hook tidak berada setelah early return).
function useSqlRestore() {
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState(null);
  const [restoreSuccess, setRestoreSuccess] = useState(null);
  const sqlInputRef = useRef();

  const handleRestore = async (e) => {
    setRestoreError(null);
    setRestoreSuccess(null);
    setRestoring(true);
    const file = e.target.files[0];
    if (!file) { setRestoring(false); return; }
    try {
      const sql = await file.text();
      if (!sql || !sql.trim()) {
        setRestoreError('Restore gagal: File SQL kosong atau tidak terbaca.');
        setRestoring(false);
        sqlInputRef.current.value = '';
        return;
      }
      const res = await fetch('/api/tools/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ sql }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Restore gagal');
      setRestoreSuccess('Restore database berhasil!');
    } catch (err) {
      setRestoreError('Restore gagal: ' + (err.message || err));
    }
    setRestoring(false);
    sqlInputRef.current.value = '';
  };

  return { restoring, restoreError, restoreSuccess, sqlInputRef, handleRestore };
}

// State + handler backup SQL.
function useSqlBackup() {
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

export default function ToolsPage() {
  const { user, navigate } = useOwnerAuth();
  const { restoring, restoreError, restoreSuccess, sqlInputRef, handleRestore } = useSqlRestore();
  const { backingUp, backupError, backupSuccess, handleBackup } = useSqlBackup();

  if (!user || user.role !== 'owner') {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Tools</h1></div>
        <div className="card">Hanya Owner aplikasi yang dapat mengakses halaman ini.</div>
      </div>
    );
  }

  // --- Backup & restore handler sekarang di custom hooks di atas file ---

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>🛠️ Tools Owner</h1>
          <p>Utilitas backup, restore, dan pemeliharaan data aplikasi</p>
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

        <div className="tool-card">
          <h2>👥 User Management</h2>
          <p>Kelola user: reset password, nonaktifkan user, atau ubah role user secara manual.</p>
          <button className="btn btn-secondary" onClick={() => navigate('/user-management')}>Kelola User</button>
        </div>
      </div>
    </div>
  );
}
