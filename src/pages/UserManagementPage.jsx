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
        <div className="card" style={{ color: 'red' }}>{error}</div>
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
        <div style={{ 
          padding: 12, 
          marginBottom: 16, 
          backgroundColor: '#d4edda', 
          color: '#155724', 
          borderRadius: 6,
          border: '1px solid #c3e6cb'
        }}>
          {successMessage}
          <button 
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setSuccessMessage(null)}
          >×</button>
        </div>
      )}

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Username</th>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '12px 8px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Bands</th>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Dibuat</th>
              <th style={{ padding: '12px 8px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 8px' }}>{u.email}</td>
                <td style={{ padding: '12px 8px' }}>{u.username}</td>
                <td style={{ padding: '12px 8px' }}>
                  {editingUser === u.id ? (
                    <select 
                      value={u.role} 
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      disabled={actionLoading}
                      style={{ padding: '4px 8px' }}
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                      <option value="owner">owner</option>
                    </select>
                  ) : (
                    <span 
                      style={{ 
                        cursor: 'pointer', 
                        textDecoration: 'underline',
                        color: u.role === 'owner' ? 'red' : u.role === 'admin' ? 'orange' : 'inherit'
                      }}
                      onClick={() => setEditingUser(u.id)}
                    >
                      {u.role}
                    </span>
                  )}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ 
                      padding: '4px 12px', 
                      fontSize: '0.85em',
                      backgroundColor: u.isActive ? '#28a745' : '#dc3545',
                      color: '#fff',
                      border: 'none'
                    }}
                    onClick={() => handleToggleActive(u.id, u.isActive)}
                    disabled={actionLoading || u.id === user.userId}
                  >
                    {u.isActive ? 'Aktif' : 'Nonaktif'}
                  </button>
                </td>
                <td style={{ padding: '12px 8px', fontSize: '0.85em' }}>
                  {u.bands && u.bands.length > 0 ? (
                    <div>
                      {u.bands.map((b) => (
                        <div key={b.bandId}>
                          {b.bandName} <span style={{ color: '#888' }}>({b.role})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#999' }}>-</span>
                  )}
                </td>
                <td style={{ padding: '12px 8px', fontSize: '0.85em' }}>
                  {new Date(u.createdAt).toLocaleDateString('id-ID')}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '0.8em', marginRight: 4 }}
                    onClick={() => setResetPasswordModal(u)}
                    disabled={actionLoading}
                  >
                    Reset Password
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '0.8em', backgroundColor: '#dc3545', color: '#fff', border: 'none' }}
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
          <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
            Tidak ada users
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetPasswordModal && (
        <div className="modal-overlay" onClick={() => setResetPasswordModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
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
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
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
