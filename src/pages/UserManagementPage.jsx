import React, { useState, useEffect } from 'react';
import * as apiClient from '../apiClient.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function UserManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordModal, setResetPasswordModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (user && user.role === 'owner') {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAllUsers();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data users');
    }
    setLoading(false);
  };

  const handleToggleActive = async (userId, currentActive) => {
    if (!confirm(`${currentActive ? 'Nonaktifkan' : 'Aktifkan'} user ini?`)) return;
    setActionLoading(true);
    try {
      await apiClient.updateUser(userId, { isActive: currentActive ? 0 : 1 });
      setSuccessMessage(`User berhasil ${currentActive ? 'dinonaktifkan' : 'diaktifkan'}`);
      loadUsers();
    } catch (err) {
      alert(err.message || 'Gagal mengubah status user');
    }
    setActionLoading(false);
  };

  const handleChangeRole = async (userId, newRole) => {
    if (!confirm(`Ubah role user ini menjadi ${newRole}?`)) return;
    setActionLoading(true);
    try {
      await apiClient.updateUser(userId, { role: newRole });
      setSuccessMessage('Role user berhasil diubah');
      loadUsers();
      setEditingUser(null);
    } catch (err) {
      alert(err.message || 'Gagal mengubah role');
    }
    setActionLoading(false);
  };

  const handleResetPassword = async (userId) => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password minimal 6 karakter');
      return;
    }
    if (!confirm('Reset password user ini?')) return;
    setActionLoading(true);
    try {
      await apiClient.resetUserPassword(userId, newPassword);
      setSuccessMessage('Password berhasil direset');
      setResetPasswordModal(null);
      setNewPassword('');
    } catch (err) {
      alert(err.message || 'Gagal reset password');
    }
    setActionLoading(false);
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Hapus user ini? (soft delete)')) return;
    setActionLoading(true);
    try {
      await apiClient.deleteUser(userId);
      setSuccessMessage('User berhasil dihapus');
      loadUsers();
    } catch (err) {
      alert(err.message || 'Gagal menghapus user');
    }
    setActionLoading(false);
  };

  if (!user || user.role !== 'owner') {
    return (
      <div className="page-container">
        <div className="page-header"><h1>User Management</h1></div>
        <div className="card">Hanya Owner aplikasi yang dapat mengakses halaman ini.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header"><h1>User Management</h1></div>
        <div className="card">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header"><h1>User Management</h1></div>
        <div className="card user-management-error-card">{error}</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>User Management</h1>
        <button className="btn btn-secondary" onClick={loadUsers}>Refresh</button>
      </div>

      {successMessage && (
        <div className="user-management-success-banner">
          {successMessage}
          <button
            className="user-management-banner-close"
            onClick={() => setSuccessMessage(null)}
          >×</button>
        </div>
      )}

      <div className="card">
        <table className="user-management-table">
          <thead>
            <tr className="user-management-table-head-row">
              <th>Email</th>
              <th>Username</th>
              <th>Role</th>
              <th className="user-management-cell-center">Status</th>
              <th>Bands</th>
              <th>Dibuat</th>
              <th className="user-management-cell-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="user-management-table-row">
                <td>{u.email}</td>
                <td>{u.username}</td>
                <td>
                  {editingUser === u.id ? (
                    <select
                      className="user-management-role-select"
                      value={u.role} 
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      disabled={actionLoading}
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                      <option value="owner">owner</option>
                    </select>
                  ) : (
                    <span
                      className={`user-management-role-label user-management-role-${u.role}`}
                      onClick={() => setEditingUser(u.id)}
                    >
                      {u.role}
                    </span>
                  )}
                </td>
                <td className="user-management-cell-center">
                  <button
                    className={`btn btn-secondary user-management-status-btn ${u.isActive ? 'is-active' : 'is-inactive'}`}
                    onClick={() => handleToggleActive(u.id, u.isActive)}
                    disabled={actionLoading || u.id === user.userId}
                  >
                    {u.isActive ? 'Aktif' : 'Nonaktif'}
                  </button>
                </td>
                <td className="user-management-small-cell">
                  {u.bands && u.bands.length > 0 ? (
                    <div>
                      {u.bands.map((b) => (
                        <div key={b.bandId}>
                          {b.bandName} <span className="user-management-band-role">({b.role})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="user-management-muted">-</span>
                  )}
                </td>
                <td className="user-management-small-cell">
                  {new Date(u.createdAt).toLocaleDateString('id-ID')}
                </td>
                <td className="user-management-cell-center">
                  <button
                    className="btn btn-secondary user-management-action-btn"
                    onClick={() => setResetPasswordModal(u)}
                    disabled={actionLoading}
                  >
                    Reset Password
                  </button>
                  <button
                    className="btn btn-secondary user-management-delete-btn"
                    onClick={() => handleDeleteUser(u.id)}
                    disabled={actionLoading || u.id === user.userId}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="user-management-empty-state">
            Tidak ada users
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetPasswordModal && (
        <div className="modal-overlay" onClick={() => setResetPasswordModal(null)}>
          <div className="modal user-management-reset-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reset Password</h2>
            <p>Reset password untuk: <b>{resetPasswordModal.email}</b></p>
            <input
              type="password"
              className="modal-input"
              placeholder="Password baru (min. 6 karakter)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={actionLoading}
            />
            <div className="user-management-modal-actions">
              <button
                className="btn btn-primary"
                onClick={() => handleResetPassword(resetPasswordModal.id)}
                disabled={actionLoading || !newPassword}
              >
                {actionLoading ? 'Processing...' : 'Reset Password'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setResetPasswordModal(null);
                  setNewPassword('');
                }}
                disabled={actionLoading}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
