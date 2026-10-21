/**
 * useAdminUsers.js
 *
 * State + aksi untuk mengelola user langsung dari halaman Administrator:
 * memuat daftar user, mengubah role, aktif/nonaktifkan akun, reset password,
 * dan hapus akun (soft delete).
 *
 * Aturan wewenang (lihat `canManageUserRole` di utils/adminAccess.js):
 * - admin tidak bisa memberi role `owner`,
 * - admin tidak bisa mengubah/menghapus akun owner,
 * - tidak ada yang bisa mengubah role atau menghapus akunnya sendiri.
 */
import { useCallback, useEffect, useState } from 'react';
import * as apiClient from '../../apiClient.js';
import { canManageUserRole } from '../../utils/adminAccess.js';

export function useAdminUsers({ actor, enabled = true }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [actionError, setActionError] = useState(null);

  const actorId = actor?.userId || actor?.id || null;

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAllUsers();
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data user');
    }
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const isSelf = (targetUserId) => actorId && String(targetUserId) === String(actorId);

  const canEditRole = (targetUser) =>
    !isSelf(targetUser?.id) && canManageUserRole(actor, targetUser);

  const canToggleActive = (targetUser) => !isSelf(targetUser?.id);

  const canDelete = (targetUser) => canEditRole(targetUser);

  const changeRole = async (targetUserId, nextRole) => {
    const target = users.find((u) => String(u.id) === String(targetUserId));
    if (!canManageUserRole(actor, target, nextRole) || isSelf(targetUserId)) {
      setActionError('Anda tidak berwenang mengubah role user ini');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await apiClient.updateUser(targetUserId, { role: nextRole });
      setMessage(`Role user diubah menjadi ${nextRole}`);
      await load();
    } catch (err) {
      setActionError(err.message || 'Gagal mengubah role');
    }
    setActionLoading(false);
  };

  const toggleActive = async (targetUser) => {
    if (!canToggleActive(targetUser)) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const nextActive = targetUser.isActive ? 0 : 1;
      await apiClient.updateUser(targetUser.id, { isActive: nextActive });
      setMessage(`User ${nextActive ? 'diaktifkan' : 'dinonaktifkan'}`);
      await load();
    } catch (err) {
      setActionError(err.message || 'Gagal mengubah status user');
    }
    setActionLoading(false);
  };

  const resetPassword = async (targetUserId, newPassword) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiClient.resetUserPassword(targetUserId, newPassword);
      setMessage('Password user berhasil direset');
      return true;
    } catch (err) {
      setActionError(err.message || 'Gagal reset password');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const deleteUser = async (targetUser) => {
    if (!canDelete(targetUser)) {
      setActionError('Anda tidak berwenang menghapus user ini');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await apiClient.deleteUser(targetUser.id);
      setMessage('User berhasil dihapus');
      await load();
    } catch (err) {
      setActionError(err.message || 'Gagal menghapus user');
    }
    setActionLoading(false);
  };

  return {
    users,
    loading,
    error,
    actionLoading,
    message,
    actionError,
    clearMessage: () => setMessage(null),
    clearActionError: () => setActionError(null),
    reload: load,
    changeRole,
    toggleActive,
    resetPassword,
    deleteUser,
    isSelf,
    canEditRole,
    canToggleActive,
    canDelete,
  };
}

export default useAdminUsers;
