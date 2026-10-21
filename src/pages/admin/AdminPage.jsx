/**
 * AdminPage.jsx
 *
 * Halaman khusus Administrator (/admin) — pusat kendali untuk role akun
 * `admin` dan `owner` aplikasi (lihat `src/utils/adminAccess.js`).
 * Direktori `src/pages/admin` memuat semua halaman khusus administrator.
 *
 * Isi halaman:
 * 1. Ringkasan statistik akun (dari endpoint /users — owner & admin).
 * 2. Pintasan modul administrasi.
 * 3. Kelola user langsung di halaman ini (role, status, reset password, hapus).
 * 4. Toggle modul aplikasi (sama seperti halaman Modul, tanpa harus pindah).
 * 5. Backup & Restore database langsung dari halaman ini.
 * 6. Audit log dengan filter + aktivitas terbaru.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as apiClient from '../../apiClient.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useModulesEnabled } from '../../hooks/useModulesEnabled.js';
import { getAdminOnlyModulesWithStatus, getModulesWithStatus } from '../../modules/registry.js';
import { useSqlBackup } from '../../modules/backup-restore/useSqlBackup.js';
import { useSqlRestore } from '../../modules/backup-restore/useSqlRestore.js';
import {
  ACTION_CATEGORIES,
  SEVERITY_LEVELS,
  filterAuditLogs,
  formatActionName,
  generateAuditReport,
} from '../../utils/auditLogger.js';
import {
  getAppRoleLabel,
  getAssignableRoles,
  getModuleAccessLabel,
  isAppAdmin,
  summarizeUsers,
} from '../../utils/adminAccess.js';
import { useAdminUsers } from './useAdminUsers.js';
import './admin.css';

// Sub-komponen halaman ini menerima objek dari context/props internal.
/* eslint-disable react/prop-types */

const ACCESS_DENIED_TEXT = 'Halaman ini hanya dapat diakses oleh Administrator aplikasi.';

const ADMIN_FILTER_DEFAULTS = { category: '', severity: '', status: '' };

const formatTimestamp = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

function formatModuleToggleLabel(moduleName, enabled) {
  return `${enabled ? 'Nonaktifkan' : 'Aktifkan'} modul ${moduleName}`;
}

/** Panel Kelola User: semua aksi user management tanpa pindah halaman. */
function AdminUserPanel({ actor }) {
  const {
    users,
    loading,
    error,
    actionLoading,
    message,
    actionError,
    clearMessage,
    clearActionError,
    reload,
    changeRole,
    toggleActive,
    resetPassword,
    deleteUser,
    canEditRole,
    canToggleActive,
    canDelete,
  } = useAdminUsers({ actor, enabled: true });

  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  return (
    <div className="card admin-panel" id="admin-users">
      <div className="admin-panel-header">
        <h2>👥 Kelola User</h2>
        <button type="button" className="btn btn-secondary" onClick={reload} disabled={loading}>
          {loading ? 'Memuat...' : 'Muat ulang'}
        </button>
      </div>

      {message && (
        <div className="admin-panel-banner is-success" role="status">
          {message}
          <button type="button" onClick={clearMessage} aria-label="Tutup">×</button>
        </div>
      )}
      {(actionError || error) && (
        <div className="admin-panel-banner is-error" role="alert">
          {actionError || error}
          <button type="button" onClick={clearActionError} aria-label="Tutup">×</button>
        </div>
      )}

      {!loading && users.length === 0 && !error && (
        <div className="admin-muted">Tidak ada user.</div>
      )}

      {users.length > 0 && (
        <div className="admin-user-table-wrap">
          <table className="admin-user-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const roles = getAssignableRoles(actor, u);
                const roleEditable = canEditRole(u) && roles.length > 0;
                return (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.username}</td>
                    <td>
                      {roleEditable ? (
                        <select
                          value={u.role}
                          disabled={actionLoading}
                          aria-label={`Role user ${u.email}`}
                          onChange={(event) => changeRole(u.id, event.target.value)}
                        >
                          {roles.map((role) => (
                            <option key={role} value={role}>{getAppRoleLabel(role)}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`admin-role-pill admin-role-${u.role}`}>
                          {getAppRoleLabel(u.role)}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="admin-status-pill">
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="admin-user-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={actionLoading || !canToggleActive(u)}
                        onClick={() => toggleActive(u)}
                      >
                        {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={actionLoading}
                        onClick={() => { setResetTarget(u); setNewPassword(''); }}
                      >
                        Reset Password
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={actionLoading || !canDelete(u)}
                        onClick={() => {
                          if (confirm(`Hapus user ${u.email}?`)) deleteUser(u);
                        }}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {resetTarget && (
        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="modal admin-reset-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Reset Password</h2>
            <p>Reset password untuk: <b>{resetTarget.email}</b></p>
            <input
              type="password"
              className="modal-input"
              placeholder="Password baru (min. 6 karakter)"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={actionLoading}
            />
            <div className="admin-backup-form">
              <button
                type="button"
                className="btn btn-primary"
                disabled={actionLoading || newPassword.length < 6}
                onClick={async () => {
                  const ok = await resetPassword(resetTarget.id, newPassword);
                  if (ok) setResetTarget(null);
                }}
              >
                {actionLoading ? 'Memproses...' : 'Reset Password'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setResetTarget(null)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Backup & Restore database + Audit log lengkap — tanpa pindah halaman. */
function AdminBackupAndAudit() {
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);
  const [logFilters, setLogFilters] = useState(ADMIN_FILTER_DEFAULTS);

  const { backingUp, backupError, backupSuccess, handleBackup } = useSqlBackup();
  const { restoring, restoreError, restoreSuccess, sqlInputRef, handleRestore } = useSqlRestore();

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const data = await apiClient.getAuditLogs({ limit: 50 });
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
    } catch (err) {
      setLogsError(err.message || 'Gagal memuat audit log');
    }
    setLogsLoading(false);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const report = useMemo(() => generateAuditReport(logs), [logs]);
  const filteredLogs = useMemo(() => filterAuditLogs(logs, logFilters), [logs, logFilters]);

  return (
    <>
      <h2 className="admin-section-title" id="admin-backup">Backup &amp; Restore Database</h2>
      <div className="card admin-panel">
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

      <h2 className="admin-section-title" id="admin-audit">Audit Log</h2>
      <div className="card admin-panel">
        <div className="admin-panel-header">
          <span className="admin-muted">
            {filteredLogs.length} dari {logs.length} entri · hari ini {report.timeline.today} ·
            mencurigakan {report.suspiciousActivity.length}
          </span>
          <button type="button" className="btn btn-secondary" onClick={loadLogs} disabled={logsLoading}>
            {logsLoading ? 'Memuat...' : 'Muat ulang'}
          </button>
        </div>
        <div className="audit-log-filters">
          <label>
            Kategori
            <select
              value={logFilters.category}
              onChange={(event) => setLogFilters((prev) => ({ ...prev, category: event.target.value }))}
            >
              {['', ...Object.values(ACTION_CATEGORIES)].map((value) => (
                <option key={value || 'all'} value={value}>{value || 'Semua'}</option>
              ))}
            </select>
          </label>
          <label>
            Severity
            <select
              value={logFilters.severity}
              onChange={(event) => setLogFilters((prev) => ({ ...prev, severity: event.target.value }))}
            >
              {['', ...Object.values(SEVERITY_LEVELS)].map((value) => (
                <option key={value || 'all'} value={value}>{value || 'Semua'}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={logFilters.status}
              onChange={(event) => setLogFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              {['', 'success', 'failed'].map((value) => (
                <option key={value || 'all'} value={value}>{value || 'Semua'}</option>
              ))}
            </select>
          </label>
        </div>
        {logsError && <div className="tools-feedback tools-feedback-error">{logsError}</div>}
        {logsLoading && logs.length === 0 && <div className="admin-muted">Memuat audit log...</div>}
        {!logsLoading && !logsError && filteredLogs.length === 0 && (
          <div className="admin-muted">Belum ada catatan yang cocok dengan filter ini.</div>
        )}
        {filteredLogs.length > 0 && (
          <div className="admin-user-table-wrap">
            <table className="admin-user-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>User</th>
                  <th>Aksi</th>
                  <th>Severity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr key={log.id || `${log.action}-${log.createdAt}-${index}`}>
                    <td>{formatTimestamp(log.createdAt)}</td>
                    <td>{log.username || log.userId || '-'}</td>
                    <td title={log.description || ''}>{formatActionName(log.action || '')}</td>
                    <td>{log.severity || '-'}</td>
                    <td>
                      {log.status && (
                        <span className={`admin-activity-status is-${log.status}`}>{log.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="admin-section-title">Aktivitas Terbaru</h2>
      <div className="card admin-activity-card">
        {logsLoading && logs.length === 0 && (
          <div className="admin-muted">Memuat aktivitas...</div>
        )}
        {!logsLoading && !logsError && logs.length === 0 && (
          <div className="admin-muted">Belum ada catatan aktivitas.</div>
        )}
        {logs.length > 0 && (
          <ul className="admin-activity-list">
            {logs.slice(0, 5).map((log, index) => (
              <li key={log.id || `${log.action}-${log.createdAt}-${index}`} className="admin-activity-item">
                <span className="admin-activity-action">{formatActionName(log.action || '')}</span>
                <span className="admin-activity-meta">
                  {log.username || log.userId || '-'} · {formatTimestamp(log.createdAt)}
                </span>
                {log.status && (
                  <span className={`admin-activity-status is-${log.status}`}>{log.status}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = isAppAdmin(user);

  const { statuses, setEnabled } = useModulesEnabled();
  const modules = useMemo(() => getModulesWithStatus(), []);
  // Modul khusus Administrator (Backup & Restore, Audit Log) hanya muncul di sini.
  const adminModules = useMemo(() => getAdminOnlyModulesWithStatus(), []);

  // Ringkasan akun memakai data user yang sama dengan panel Kelola User.
  const { users, loading: usersLoading, error: usersError } = useAdminUsers({
    actor: user,
    enabled: isAdmin,
  });

  const userSummary = useMemo(() => summarizeUsers(users), [users]);

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
          <p>Semua fitur administrasi: kelola user, modul, backup, dan audit log.</p>
        </div>
        <span className={`admin-role-badge admin-role-${user.role}`}>
          {getAppRoleLabel(user.role)}
        </span>
      </div>

      {/* Ringkasan akun */}
      <div className="card admin-summary-card">
        <div className="admin-stat-grid">
          <div className="admin-stat">
            <strong>{usersLoading ? '…' : userSummary.total}</strong>
            <span>Total user</span>
          </div>
          <div className="admin-stat">
            <strong>{usersLoading ? '…' : userSummary.active}</strong>
            <span>User aktif</span>
          </div>
          <div className="admin-stat">
            <strong>{usersLoading ? '…' : userSummary.inactive}</strong>
            <span>User nonaktif</span>
          </div>
          <div className="admin-stat">
            <strong>{usersLoading ? '…' : userSummary.admins}</strong>
            <span>Admin &amp; Owner</span>
          </div>
        </div>
        {usersError && <div className="tools-feedback tools-feedback-error">{usersError}</div>}
      </div>

      {/* Pintasan administrasi — semua mengarah ke bagian di halaman ini. */}
      <h2 className="admin-section-title">Kelola Sistem</h2>
      <div className="tools-grid admin-actions-grid">
        <div className="tool-card admin-card">
          <h2>👥 Manajemen User</h2>
          <p>Ubah role, aktif/nonaktifkan, reset password, atau hapus akun user.</p>
          <button className="btn btn-primary" onClick={() => scrollTo('admin-users')}>Kelola User</button>
        </div>
        <div className="tool-card admin-card">
          <h2>💾 Backup &amp; Restore</h2>
          <p>Backup seluruh database ke file SQL atau pulihkan dari backup sebelumnya.</p>
          <button className="btn btn-primary" onClick={() => scrollTo('admin-backup')}>Buka Backup</button>
        </div>
        <div className="tool-card admin-card">
          <h2>🔍 Audit Log</h2>
          <p>Riwayat login, perubahan data, dan aksi kritis dengan filter kategori.</p>
          <button className="btn btn-primary" onClick={() => scrollTo('admin-audit')}>Lihat Audit Log</button>
        </div>
        <div className="tool-card admin-card">
          <h2>🧩 Modul Aplikasi</h2>
          <p>Aktifkan atau nonaktifkan modul tambahan. Atur langsung di daftar di bawah.</p>
          <button className="btn btn-secondary" onClick={() => scrollTo('admin-modules')}>
            Lihat Modul
          </button>
        </div>
      </div>

      {/* Kelola user */}
      <AdminUserPanel actor={user} />

      {/* Toggle modul aplikasi */}
      <h2 className="admin-section-title" id="admin-modules">Modul Aplikasi</h2>
      <div className="card admin-modules-list">
        {modules.length === 0 && <div className="admin-muted">Belum ada modul terdaftar.</div>}
        {modules.map((mod) => {
          const enabled = !!statuses[mod.id];
          return (
            <div key={mod.id} className={`admin-module-row${enabled ? ' is-active' : ''}`}>
              <div className="admin-module-info">
                <strong>
                  <span aria-hidden="true">{mod.icon}</span> {mod.name}
                </strong>
                <span className="admin-muted">{mod.description}</span>
              </div>
              <span className="admin-access-tag">
                {mod.adminOnly ? '🔒 khusus admin' : getModuleAccessLabel(mod.id)}
              </span>
              <label className="modules-toggle">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => setEnabled(mod.id, event.target.checked)}
                  aria-label={formatModuleToggleLabel(mod.name, enabled)}
                />
                <span className="modules-toggle-track" aria-hidden="true">
                  <span className="modules-toggle-thumb" />
                </span>
                <span className="modules-toggle-state">{enabled ? 'Aktif' : 'Nonaktif'}</span>
              </label>
            </div>
          );
        })}
      </div>

      {/* Modul khusus Administrator */}
      <h2 className="admin-section-title">Modul Khusus Administrator</h2>
      <div className="card admin-modules-list">
        {adminModules.length === 0 && (
          <div className="admin-muted">Belum ada modul khusus administrator.</div>
        )}
        {adminModules.map((mod) => {
          const enabled = !!statuses[mod.id];
          return (
            <div key={mod.id} className={`admin-module-row${enabled ? ' is-active' : ''}`}>
              <div className="admin-module-info">
                <strong>
                  <span aria-hidden="true">{mod.icon}</span> {mod.name}
                </strong>
                <span className="admin-muted">{mod.description}</span>
              </div>
              <label className="modules-toggle">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => setEnabled(mod.id, event.target.checked)}
                  aria-label={formatModuleToggleLabel(mod.name, enabled)}
                />
                <span className="modules-toggle-track" aria-hidden="true">
                  <span className="modules-toggle-thumb" />
                </span>
                <span className="modules-toggle-state">{enabled ? 'Aktif' : 'Nonaktif'}</span>
              </label>
            </div>
          );
        })}
      </div>

      {/* Backup/Restore + Audit log */}
      <AdminBackupAndAudit />
    </div>
  );
}
