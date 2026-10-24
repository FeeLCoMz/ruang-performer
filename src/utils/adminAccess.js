/**
 * adminAccess.js
 *
 * Aturan akses ke halaman khusus Administrator (/admin).
 *
 * Aplikasi punya dua level role yang berbeda maknanya:
 * - `user.role`  : role akun aplikasi (owner / admin / member)
 * - role di band : diatur terpisah di permissionUtils.js
 *
 * Halaman Administrator memakai role akun aplikasi. `owner` selalu dihitung
 * sebagai administrator supaya tidak ada situasi tanpa admin sama sekali;
 * beberapa data (mis. daftar semua user & audit log) tetap khusus owner sesuai
 * pembatasan di sisi server.
 */

export const ADMIN_ROLES = ['owner', 'admin'];

/** Label tampilan untuk role akun aplikasi. */
export const APP_ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

/** Role yang boleh mengakses /admin. */
export function isAppAdmin(user) {
  return Boolean(user && ADMIN_ROLES.includes(user.role));
}

/** Hanya owner aplikasi — untuk wewenang yang tetap eksklusif owner. */
export function isAppOwner(user) {
  return Boolean(user && user.role === 'owner');
}

/**
 * Boleh mengubah role akun target?
 * Admin tidak boleh memberi role owner, mengubah, atau menghapus akun owner —
 * aturan yang sama diterapkan di server (user-id.js).
 */
export function canManageUserRole(actor, targetUser, nextRole) {
  if (!actor) return false;
  if (actor.role === 'owner') return true;
  if (actor.role !== 'admin') return false;
  if (!targetUser) return true;
  if (targetUser.role === 'owner') return false;
  if (nextRole === 'owner') return false;
  return true;
}

/** Role yang boleh dipilih saat mengubah role user lain. */
export function getAssignableRoles(actor, targetUser) {
  const roles = ['member', 'admin', 'owner'];
  if (actor?.role === 'owner') return roles;
  if (actor?.role === 'admin' && targetUser?.role !== 'owner') return roles.filter((r) => r !== 'owner');
  return [];
}

export function getAppRoleLabel(role) {
  return APP_ROLE_LABELS[role] || role || '-';
}

/**
 * Fitur administrator default — selalu aktif, tidak punya toggle on/off dan
 * tidak terdaftar di `src/modules/registry.js`.
 */
export const ADMIN_MODULES = [
  {
    id: 'user-management',
    name: 'Manajemen User',
    icon: '👥',
    description: 'Ubah role, aktif/nonaktifkan, reset password, atau hapus akun user.',
    path: '/user-management',
  },
  {
    id: 'backup-restore',
    name: 'Backup & Restore Database',
    icon: '💾',
    description: 'Backup seluruh database ke file SQL dan pulihkan kembali dari file backup.',
    path: '/admin#backup',
  },
  {
    id: 'audit-log',
    name: 'Audit Log',
    icon: '🔍',
    description:
      'Riwayat aktivitas pengguna (login, perubahan data, aksi kritis) dengan filter kategori & severity.',
    path: '/admin#audit',
  },
];

/**
 * Matriks akses yang ditampilkan di halaman Administrator.
 * Semua fitur administrator (Manajemen User, Backup & Restore, Audit Log)
 * dapat diakses role `owner` maupun `admin`; hanya pemberian/pengubahan
 * role `owner` yang tetap khusus owner (dijaga di server).
 */
export const ADMIN_MODULE_ACCESS = {
  'user-management': 'khusus admin',
  'backup-restore': 'khusus admin',
  'audit-log': 'khusus admin',
  modules: 'semua user',
  'chord-transcriber': 'semua user',
  'bulk-lyrics': 'semua user',
};

export function getModuleAccessLabel(moduleId) {
  return ADMIN_MODULE_ACCESS[moduleId] || 'semua user';
}

/**
 * Ringkasan jumlah user dari payload GET /api/users (owner & admin).
 * @param {Array<Object>} users
 * @returns {{ total: number, active: number, inactive: number, admins: number, byRole: Object }}
 */
export function summarizeUsers(users) {
  const list = Array.isArray(users) ? users : [];
  const byRole = { owner: 0, admin: 0, member: 0 };
  let active = 0;

  for (const user of list) {
    if (!user) continue;
    const role = user.role || 'member';
    byRole[role] = (byRole[role] || 0) + 1;
    // isActive bisa berupa boolean atau 0/1 dari database.
    if (user.isActive === true || Number(user.isActive) === 1) active += 1;
  }

  return {
    total: list.length,
    active,
    inactive: list.length - active,
    admins: (byRole.owner || 0) + (byRole.admin || 0),
    byRole,
  };
}
