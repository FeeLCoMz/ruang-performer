/**
 * AdminPage.jsx
 *
 * Halaman khusus Administrator (/admin) — pusat kendali untuk role akun
 * `admin` dan `owner` aplikasi (lihat `src/utils/adminAccess.js`).
 *
 * File ini hanya bertugas merangkai panel; setiap panel ada di folder
 * fiturnya masing-masing:
 * - users/UserManagementPanel.jsx                 → kelola user + ringkasan akun
 * - backup-restore/BackupRestorePanel.jsx         → backup & restore database
 * - audit-log/AuditLogPanel.jsx + useAuditLogs.js → audit log & aktivitas
 *
 * Data user dimiliki satu hook (`useAdminUsers`) dan dibagikan ke ringkasan
 * statistik maupun tabel user, sehingga endpoint /users hanya dipanggil sekali.
 */
import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getAppRoleLabel, isAppAdmin, summarizeUsers } from '../../utils/adminAccess.js';
import { useAdminUsers } from './useAdminUsers.js';
import { useAuditLogs } from './audit-log/useAuditLogs.js';
import AuditLogPanel from './audit-log/AuditLogPanel.jsx';
import UserManagementPanel from './users/UserManagementPanel.jsx';
import BackupRestorePanel from './backup-restore/BackupRestorePanel.jsx';
import './admin.css';

// Sub-komponen halaman ini menerima objek dari context/props internal.
/* eslint-disable react/prop-types */

const ACCESS_DENIED_TEXT = 'Halaman ini hanya dapat diakses oleh Administrator aplikasi.';

/** Kartu pintasan — semuanya mengarah ke bagian di halaman ini. */
function AdminShortcuts({ onScrollTo }) {
  const shortcuts = [
    {
      id: 'admin-users',
      title: '👥 Manajemen User',
      description: 'Ubah role, aktif/nonaktifkan, reset password, atau hapus akun user.',
      action: 'Kelola User',
      variant: 'btn-primary',
    },
    {
      id: 'admin-backup',
      title: '💾 Backup & Restore',
      description: 'Backup seluruh database ke file SQL atau pulihkan dari backup sebelumnya.',
      action: 'Buka Backup',
      variant: 'btn-primary',
    },
    {
      id: 'admin-audit',
      title: '🔍 Audit Log',
      description: 'Riwayat login, perubahan data, dan aksi kritis dengan filter kategori.',
      action: 'Lihat Audit Log',
      variant: 'btn-primary',
    },
  ];

  return (
    <div className="tools-grid admin-actions-grid">
      {shortcuts.map((item) => (
        <div key={item.id} className="tool-card admin-card">
          <h2>{item.title}</h2>
          <p>{item.description}</p>
          <button className={`btn ${item.variant}`} onClick={() => onScrollTo(item.id)}>
            {item.action}
          </button>
        </div>
      ))}
    </div>
  );
}

/** Ringkasan jumlah akun dari data user yang sama dengan tabel Kelola User. */
function AdminUserSummary({ summary, loading, error }) {
  const stats = [
    { value: summary.total, label: 'Total user' },
    { value: summary.active, label: 'User aktif' },
    { value: summary.inactive, label: 'User nonaktif' },
    { value: summary.admins, label: 'Admin & Owner' },
  ];

  return (
    <div className="card admin-summary-card">
      <div className="admin-stat-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="admin-stat">
            <strong>{loading ? '…' : stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
      {error && <div className="tools-feedback tools-feedback-error">{error}</div>}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = isAppAdmin(user);

  // Satu sumber data user untuk ringkasan statistik dan panel Kelola User.
  const adminUsers = useAdminUsers({ actor: user, enabled: isAdmin });
  const userSummary = useMemo(() => summarizeUsers(adminUsers.users), [adminUsers.users]);

  // Audit log hanya dimuat untuk administrator.
  const auditLogs = useAuditLogs({ limit: 50, enabled: isAdmin });

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Administrator</h1></div>
        <div className="card">{ACCESS_DENIED_TEXT}</div>
      </div>
    );
  }

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="page-container admin-page">
      <div className="page-header">
        <div>
          <h1>🛡️ Administrator</h1>
          <p>Semua fitur administrasi: kelola user, backup, dan audit log.</p>
        </div>
        <span className={`admin-role-badge admin-role-${user.role}`}>
          {getAppRoleLabel(user.role)}
        </span>
      </div>

      <AdminUserSummary
        summary={userSummary}
        loading={adminUsers.loading}
        error={adminUsers.error}
      />

      <h2 className="admin-section-title">Kelola Sistem</h2>
      <AdminShortcuts onScrollTo={scrollTo} />

      <UserManagementPanel actor={user} adminUsers={adminUsers} />

      <BackupRestorePanel withHeading />
      <AuditLogPanel auditLogs={auditLogs} mode="compact" />
    </div>
  );
}
