/**
 * AuditLogPage.jsx
 *
 * Halaman audit log lengkap (rute /audit-logs) — fitur administrator default,
 * bukan modul: selalu aktif dan tidak punya toggle on/off. Isi utamanya juga
 * tersedia langsung di halaman Administrator; rute ini dipertahankan untuk
 * akses langsung/bookmark.
 *
 * Data, filter, dan tabel memakai `useAuditLogs` + `AuditLogPanel` (mode
 * "full") supaya tidak ada duplikasi logika dengan halaman /admin.
 */
import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { isAppAdmin } from '../../utils/adminAccess.js';
import { useAuditLogs } from './audit-log/useAuditLogs.js';
// Gaya audit log diimpor oleh AuditLogPanel agar ikut aktif di tab /admin.

export default function AuditLogPage() {
  const { user } = useAuth();
  const isAdmin = isAppAdmin(user);
  const auditLogs = useAuditLogs({ limit: 200, enabled: isAdmin });

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Audit Log</h1></div>
        <div className="card">Hanya Administrator aplikasi yang dapat mengakses halaman ini.</div>
      </div>
    );
  }

  return (
    <div className="page-container audit-log-page">
      <div className="page-header">
        <div>
          <h1>🔍 Audit Log</h1>
          <p>Riwayat aktivitas pengguna: login, perubahan data, dan aksi kritis.</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={auditLogs.reload}
          disabled={auditLogs.loading}
        >
          {auditLogs.loading ? 'Memuat...' : 'Muat ulang'}
        </button>
      </div>

      {auditLogs.error && (
        <div className="tools-feedback tools-feedback-error">{auditLogs.error}</div>
      )}
      {auditLogs.warning && (
        <div className="tools-feedback">Peringatan server: {auditLogs.warning}</div>
      )}

      <AuditLogPanel auditLogs={auditLogs} mode="full" />
    </div>
  );
}
