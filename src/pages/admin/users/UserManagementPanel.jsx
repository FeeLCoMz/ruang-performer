/**
 * UserManagementPanel.jsx
 *
 * Panel Kelola User di halaman Administrator: tabel user + aksi ubah role,
 * aktif/nonaktif, reset password, dan hapus akun. Data & aksi berasal dari
 * `useAdminUsers` yang dimiliki AdminPage agar satu sumber data untuk tabel
 * maupun ringkasan statistik.
 *
 * Aksi per baris ada di menu (⋯) supaya tidak rawan salah klik; aksi yang
 * mengubah/menghapus akun lebih dulu meminta konfirmasi lewat modal.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { getAppRoleLabel, getAssignableRoles } from '../../../utils/adminAccess.js';
import { formatLastLogin } from './userStats.js';

// State filter selalu disalin dari konstanta ini: mengirim ulang objek yang
// sama persis membuat React mengabaikan update (bailout referensi).
const EMPTY_FILTERS = { search: '', role: '', status: '', login: '' };

const ROLE_FILTERS = [
  { value: '', label: 'Semua role' },
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
];

const STATUS_FILTERS = [
  { value: '', label: 'Semua status' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
];

const LOGIN_FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'never', label: 'Belum pernah login' },
  { value: 'recent', label: 'Login 7 hari terakhir' },
];

function matchesFilters(user, { search, role, status, login }, lastLoginMap) {
  if (login) {
    const lastLogin = lastLoginMap?.get?.(user.id);
    if (login === 'never' && lastLogin) return false;
    if (login === 'recent') {
      if (!lastLogin) return false;
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (lastLogin.time < weekAgo) return false;
    }
  }

  const term = search.trim().toLowerCase();
  if (term) {
    const haystack = `${user.email || ''} ${user.username || ''}`.toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  if (role && (user.role || 'member') !== role) return false;
  if (status === 'active' && !user.isActive) return false;
  if (status === 'inactive' && user.isActive) return false;
  return true;
}

/**
 * Menu aksi per baris (⋯) memakai Popover API native: browser menangani klik
 * di luar dan Escape tanpa listener dokumen manual. Bila popover tidak
 * didukung (browser lama / jsdom), menu tetap bekerja dengan state lokal.
 */
const supportsPopover = typeof HTMLElement !== 'undefined'
  && typeof HTMLElement.prototype.showPopover === 'function';

// Props internal panel; proyek tidak memakai prop-types.
/* eslint-disable react/prop-types */
function UserActionsMenu({ user, disabled, canToggleActive, canDelete, onAction }) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  const run = (action) => {
    // Tutup menu lebih dulu, baru jalankan aksi (mis. membuka modal konfirmasi).
    if (supportsPopover && popoverRef.current?.matches(':popover-open')) {
      popoverRef.current.hidePopover();
    }
    setOpen(false);
    onAction(action, user);
  };

  /**
   * Popover baru di-mount setelah `open` bernilai true, jadi showPopover()
   * harus menunggu commit — kalau dipanggil pada render yang sama, elemennya
   * belum ada dan menu tidak pernah terbuka.
   */
  const openPopover = useCallback(() => {
    popoverRef.current?.showPopover?.();
  }, []);

  const toggle = () => {
    if (open) {
      setOpen(false);
      if (supportsPopover && popoverRef.current?.matches(':popover-open')) {
        popoverRef.current.hidePopover();
      }
      return;
    }
    setOpen(true);
  };

  // Popover hanya di-render setelah dibuka. Elemen ber-atribut `popover` yang
  // di-mount dalam keadaan tertutup tetap bisa tampil di beberapa browser
  // (dirender di top layer), sehingga menu muncul menempel di setiap baris.
  // `onToggle` sengaja tidak dipakai: popover "auto" menutup diri lebih dulu
  // saat klik di luar/Escape, dan event toggle-nya akan menimpa state `open`
  // yang baru diset false saat salah satu aksi dipilih.
  const menuProps = supportsPopover ? { popover: 'auto' } : {};

  return (
    <div className="admin-actions-menu">
      <button
        type="button"
        className="admin-actions-trigger"
        aria-label={`Aksi untuk user ${user.email}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={toggle}
      >
        ⋯
      </button>
      {open && (
        <div
          ref={(node) => {
            // Ref callback dipanggil setiap render; buka hanya sekali per node.
            const isNew = Boolean(node) && popoverRef.current !== node;
            popoverRef.current = node;
            if (isNew && supportsPopover) openPopover();
          }}
          className="admin-actions-dropdown"
          role="menu"
          {...menuProps}
        >
          <button
            type="button"
            role="menuitem"
            disabled={!canToggleActive}
            onClick={() => run('toggle')}
          >
            {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
          <button type="button" role="menuitem" onClick={() => run('reset')}>
            Reset Password
          </button>
          <button
            type="button"
            role="menuitem"
            className="is-danger"
            disabled={!canDelete}
            onClick={() => run('delete')}
          >
            Hapus
          </button>
        </div>
      )}
    </div>
  );
}

export default function UserManagementPanel({ actor, adminUsers, lastLoginMap }) {
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

  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);

  const closeResetModal = () => setResetTarget(null);
  const closeConfirmModal = () => setConfirmTarget(null);

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const visibleUsers = useMemo(
    () => users.filter((user) => matchesFilters(user, filters, lastLoginMap)),
    [users, filters, lastLoginMap],
  );

  const handleRowAction = (action, target) => {
    if (action === 'toggle') {
      setConfirmTarget({ type: 'toggle', user: target });
    } else if (action === 'reset') {
      setNewPassword('');
      setResetTarget(target);
    } else if (action === 'delete') {
      setConfirmTarget({ type: 'delete', user: target });
    }
  };

  const confirmPendingAction = async () => {
    if (!confirmTarget) return;
    if (confirmTarget.type === 'delete') {
      await deleteUser(confirmTarget.user);
    } else if (confirmTarget.type === 'toggle') {
      await toggleActive(confirmTarget.user);
    }
    closeConfirmModal();
  };

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

      <div className="admin-user-filters">
        <input
          type="search"
          className="admin-user-search"
          placeholder="Cari email atau username..."
          aria-label="Cari user"
          value={filters.search}
          onChange={(event) => setFilter('search', event.target.value)}
        />
        <label>
          Role
          <select value={filters.role} onChange={(event) => setFilter('role', event.target.value)}>
            {ROLE_FILTERS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
            {STATUS_FILTERS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          Login
          <select value={filters.login} onChange={(event) => setFilter('login', event.target.value)}>
            {LOGIN_FILTERS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        {activeFilterCount > 0 && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFilters({ ...EMPTY_FILTERS })}
          >
            Reset filter ({activeFilterCount})
          </button>
        )}
        <span className="admin-user-count">
          {visibleUsers.length} dari {users.length} user
        </span>
      </div>

      {loading && users.length === 0 && (
        <div className="admin-skeleton" aria-label="Memuat user" aria-busy="true">
          <span className="admin-skeleton-row" />
          <span className="admin-skeleton-row" />
          <span className="admin-skeleton-row" />
        </div>
      )}

      {!loading && users.length === 0 && !error && (
        <div className="admin-empty-state">
          <span className="admin-empty-icon" aria-hidden="true">👥</span>
          <strong>Belum ada user</strong>
          <span>User baru akan muncul di sini setelah mendaftar.</span>
        </div>
      )}

      {!loading && users.length > 0 && visibleUsers.length === 0 && (
        <div className="admin-empty-state">
          <span className="admin-empty-icon" aria-hidden="true">🔍</span>
          <strong>Tidak ada user yang cocok</strong>
          <span>Coba ubah kata kunci atau reset filter.</span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFilters({ ...EMPTY_FILTERS })}
          >
            Reset filter
          </button>
        </div>
      )}

      {visibleUsers.length > 0 && (
        <div className="admin-user-table-wrap">
          <table className="admin-user-table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Login terakhir</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => {
                const roles = getAssignableRoles(actor, u);
                const roleEditable = canEditRole(u) && roles.length > 0;
                const initial = (u.username || u.email || '?').charAt(0).toUpperCase();
                return (
                  <tr key={u.id}>
                    <td data-label="Avatar">
                      <span className="admin-user-avatar" aria-hidden="true">{initial}</span>
                    </td>
                    <td data-label="Username">{u.username}</td>
                    <td data-label="Email">{u.email}</td>
                    <td data-label="Role">
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
                    <td data-label="Status">
                      <span className={`admin-status-pill${u.isActive ? ' is-active' : ''}`}>
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td data-label="Login terakhir" className="admin-user-lastlogin">
                      {formatLastLogin(lastLoginMap?.get(u.id)?.iso)}
                    </td>
                    <td data-label="Aksi">
                      <UserActionsMenu
                        user={u}
                        disabled={actionLoading}
                        canToggleActive={canToggleActive(u)}
                        canDelete={canDelete(u)}
                        onAction={handleRowAction}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmTarget && (
        <div className="modal-overlay" onClick={closeConfirmModal}>
          <div
            className="modal admin-reset-modal"
            role="alertdialog"
            aria-labelledby="admin-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="admin-confirm-title">
              {confirmTarget.type === 'delete' ? 'Hapus user?' : 'Ubah status user?'}
            </h2>
            <p>
              {confirmTarget.type === 'delete'
                ? `Akun ${confirmTarget.user.email} akan dihapus. Tindakan ini tidak bisa dibatalkan.`
                : `Akun ${confirmTarget.user.email} akan ${confirmTarget.user.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`}
            </p>
            <div className="admin-backup-form">
              <button
                type="button"
                className={`btn ${confirmTarget.type === 'delete' ? 'btn-danger' : 'btn-primary'}`}
                disabled={actionLoading}
                onClick={confirmPendingAction}
              >
                {actionLoading
                  ? 'Memproses...'
                  : confirmTarget.type === 'delete' ? 'Ya, hapus' : 'Ya, lanjutkan'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeConfirmModal}>
                Batal
              </button>
            </div>
          </div>
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
