import React, { useRef, useState } from 'react';
import * as apiClient from '../apiClient.js';
import { useAuth } from '../contexts/AuthContext.jsx';
// No permission check needed, just check user.role === 'owner'

export default function ToolsPage() {
  const { user, login } = useAuth();
  React.useEffect(() => {
    async function syncUser() {
      if (!user || user.role !== 'owner') {
        try {
          const res = await apiClient.getCurrentUser();
          if (res && res.user && res.user.role === 'owner') {
            login(localStorage.getItem('authToken'), res.user);
          }
        } catch {}
      }
    }
    syncUser();
  }, []);

  if (!user || user.role !== 'owner') {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Tools</h1></div>
        <div className="card">Hanya Owner aplikasi yang dapat mengakses halaman ini.</div>
      </div>
    );
  }

  // State for import/export/backup
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupError, setBackupError] = useState(null);
  const [backupSuccess, setBackupSuccess] = useState(null);
  const fileInputRef = useRef();
  const sqlInputRef = useRef();
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState(null);
  const [restoreSuccess, setRestoreSuccess] = useState(null);
  // Restore SQL handler
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
      // Debug: tampilkan preview isi file SQL jika error
      if (sql.length < 1000) {
        setRestoreSuccess('Preview file SQL:\n' + sql.slice(0, 500));
      }
      const res = await fetch('/api/tools/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('authToken'),
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

  // State for Gemini models
  const [models, setModels] = useState(null);
  const [modelsError, setModelsError] = useState(null);
  const [loadingModels, setLoadingModels] = useState(false);

  // Export handler
  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await apiClient.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ruang-performer-backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export gagal: ' + (e.message || e));
    }
    setExporting(false);
  };

  // Backup handler
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

  // Import handler
  const handleImport = async (e) => {
    setImportError(null);
    setImportSuccess(null);
    setImporting(true);
    const file = e.target.files[0];
    if (!file) { setImporting(false); return; }
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await apiClient.importAllData(json);
      setImportSuccess('Import berhasil!');
    } catch (err) {
      setImportError('Import gagal: ' + (err.message || err));
    }
    setImporting(false);
    fileInputRef.current.value = '';
  };

  // Handler to fetch Gemini models
  const handleFetchModels = async () => {
    setLoadingModels(true);
    setModelsError(null);
    try {
      const data = await apiClient.listGeminiModels();
      setModels(data.models || []);
    } catch (err) {
      setModelsError(err.message || 'Gagal mengambil daftar model');
    }
    setLoadingModels(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Tools Owner</h1>
      </div>
      <div className="card tools-grid">
                <div className="tool-card">
                  <h2>Restore Database SQL</h2>
                  <p>Restore database dari file SQL backup. <b>Seluruh data lama akan dihapus!</b></p>
                  <input type="file" accept=".sql,text/sql" className="tools-hidden-input" ref={sqlInputRef} onChange={handleRestore} disabled={restoring} />
                  <button className="btn btn-primary" onClick={() => sqlInputRef.current && sqlInputRef.current.click()} disabled={restoring}>{restoring ? 'Restoring...' : 'Restore SQL'}</button>
                  {restoreError && <div className="tools-feedback tools-feedback-error">{restoreError}</div>}
                  {restoreSuccess && <div className="tools-feedback tools-feedback-success">{restoreSuccess}</div>}
                </div>
        <div className="tool-card">
          <h2>Export Data</h2>
          <p>Ekspor seluruh data aplikasi ke file JSON untuk backup atau migrasi.</p>
          <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>{exporting ? 'Exporting...' : 'Export JSON'}</button>
        </div>
        <div className="tool-card">
          <h2>Backup Database</h2>
          <p>Backup seluruh database ke file SQL (dump). Cocok untuk restore manual atau migrasi ke server lain.</p>
          <button className="btn btn-primary" onClick={handleBackup} disabled={backingUp}>{backingUp ? 'Backing up...' : 'Backup SQL'}</button>
          {backupError && <div className="tools-feedback tools-feedback-error">{backupError}</div>}
          {backupSuccess && <div className="tools-feedback tools-feedback-success">{backupSuccess}</div>}
        </div>
        <div className="tool-card">
          <h2>Import Data</h2>
          <p>Impor data dari file JSON untuk restore atau migrasi data.<br/><b>Seluruh data lama akan dihapus!</b></p>
          <input type="file" accept="application/json" className="tools-hidden-input" ref={fileInputRef} onChange={handleImport} disabled={importing} />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={importing}>{importing ? 'Importing...' : 'Import JSON'}</button>
          {importError && <div className="tools-feedback tools-feedback-error">{importError}</div>}
          {importSuccess && <div className="tools-feedback tools-feedback-success">{importSuccess}</div>}
        </div>
        <div className="tool-card">
          <h2>Reset Cache / Refresh Data</h2>
          <p>Bersihkan cache aplikasi atau refresh data dari server.</p>
          <button className="btn btn-secondary" disabled>Reset Cache (coming soon)</button>
        </div>
        <div className="tool-card">
          <h2>User Management</h2>
          <p>Kelola user: reset password, nonaktifkan user, atau ubah role user secara manual.</p>
          <button className="btn btn-secondary" onClick={() => window.location.href='/user-management'}>Kelola User</button>
        </div>
        <div className="tool-card">
          <h2>Audit Log Viewer</h2>
          <p>Lihat log aktivitas penting aplikasi.</p>
          <button className="btn btn-secondary" onClick={() => window.location.href='/audit-logs'}>Lihat Audit Log</button>
        </div>
        <div className="tool-card">
          <h2>System Health / Status</h2>
          <p>Lihat status server, database, dan resource penting lain.</p>
          <button className="btn btn-secondary" disabled>Lihat Status (coming soon)</button>
        </div>
        <div className="tool-card">
          <h2>Maintenance Actions</h2>
          <p>Jalankan perintah maintenance seperti reindex, migrasi, atau perbaikan data.</p>
          <button className="btn btn-secondary" disabled>Maintenance (coming soon)</button>
        </div>
        <div className="tool-card">
          <h2>Pengaturan Aplikasi</h2>
          <p>Ubah setting global aplikasi (branding, notifikasi, dsb).</p>
          <button className="btn btn-secondary" disabled>Pengaturan (coming soon)</button>
        </div>
        <div className="tool-card">
          <h2>List Gemini Models</h2>
          <p>Lihat daftar model Gemini yang tersedia dari Google Generative AI API.</p>
          <button className="btn btn-secondary" onClick={handleFetchModels} disabled={loadingModels}>
            {loadingModels ? 'Loading...' : 'List Models'}
          </button>
          {modelsError && <div className="tools-feedback tools-feedback-error">{modelsError}</div>}
          {models && (
            <div className="tools-models-wrap">
              <b>Models:</b>
              <ul className="tools-models-list">
                {models.map((m) => (
                  <li key={m.name}><b>{m.displayName || m.name}</b> <span className="tools-model-name">({m.name})</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
