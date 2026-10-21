/**
 * UserManagementPanel.jsx
 *
 * Panel Kelola User di halaman Administrator: tabel user + aksi ubah role,
 * aktif/nonaktif, reset password, dan hapus akun. Data & aksi berasal dari
 * `useAdminUsers` yang dimiliki AdminPage agar satu sumber data untuk tabel
 * maupun ringkasan statistik.
 */
import React, { useState } from 'react';
import { getAppRoleLabel, getAssignableRoles } from '../../../utils/adminAccess.js';

export default function UserManagementPanel({ actor, adminUsers }) {
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
  } = adminUsers;

  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const closeResetModal = () => setResetTarget(null);

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
        <div className="modal-overlay" onClick={closeResetModal}>
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
                  if (ok) closeResetModal();
                }}
              >
                {actionLoading ? 'Memproses...' : 'Reset Password'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeResetModal}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
