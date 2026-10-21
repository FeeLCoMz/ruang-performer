import { describe, it, expect } from 'vitest';
import {
  isAppAdmin,
  isAppOwner,
  getAppRoleLabel,
  getModuleAccessLabel,
  summarizeUsers,
  canManageUserRole,
  getAssignableRoles,
  ADMIN_MODULES,
} from '../utils/adminAccess.js';

/**
 * Halaman khusus Administrator memakai role akun aplikasi (owner/admin),
 * bukan role anggota band.
 */
describe('adminAccess', () => {
  it('mengizinkan owner dan admin mengakses halaman admin', () => {
    expect(isAppAdmin({ role: 'owner' })).toBe(true);
    expect(isAppAdmin({ role: 'admin' })).toBe(true);
  });

  it('menolak member dan user kosong', () => {
    expect(isAppAdmin({ role: 'member' })).toBe(false);
    expect(isAppAdmin(null)).toBe(false);
    expect(isAppAdmin(undefined)).toBe(false);
    expect(isAppAdmin({})).toBe(false);
  });

  it('hanya owner yang dianggap pemilik aplikasi', () => {
    expect(isAppOwner({ role: 'owner' })).toBe(true);
    expect(isAppOwner({ role: 'admin' })).toBe(false);
  });

  it('memberi label role yang ramah dibaca', () => {
    expect(getAppRoleLabel('owner')).toBe('Owner');
    expect(getAppRoleLabel('admin')).toBe('Admin');
    expect(getAppRoleLabel('member')).toBe('Member');
    expect(getAppRoleLabel(null)).toBe('-');
  });

  it('menandai modul khusus admin', () => {
    expect(getModuleAccessLabel('audit-log')).toBe('khusus admin');
    expect(getModuleAccessLabel('backup-restore')).toBe('khusus admin');
    expect(getModuleAccessLabel('modules')).toBe('semua user');
    expect(getModuleAccessLabel('modul-tidak-dikenal')).toBe('semua user');
  });

  it('fitur admin default terdaftar terpisah dari modul', () => {
    const ids = ADMIN_MODULES.map((mod) => mod.id);
    expect(ids).toContain('user-management');
    expect(ids).toContain('backup-restore');
    expect(ids).toContain('audit-log');
    // Fitur admin default tidak punya toggle on/off.
    ADMIN_MODULES.forEach((mod) => {
      expect(mod.setEnabled).toBeUndefined();
      expect(mod.isEnabled).toBeUndefined();
    });
  });

  it('admin boleh mengelola user biasa tetapi bukan owner', () => {
    const admin = { role: 'admin' };
    const owner = { role: 'owner' };
    const member = { role: 'member' };

    expect(canManageUserRole(admin, member, 'admin')).toBe(true);
    expect(canManageUserRole(admin, member, 'owner')).toBe(false);
    expect(canManageUserRole(admin, owner, 'member')).toBe(false);
    expect(canManageUserRole(owner, owner, 'member')).toBe(true);
    expect(canManageUserRole(member, member, 'admin')).toBe(false);
  });

  it('role owner tidak bisa diberikan admin saat mengubah role', () => {
    expect(getAssignableRoles({ role: 'admin' }, { role: 'member' })).toEqual(['member', 'admin']);
    expect(getAssignableRoles({ role: 'admin' }, { role: 'owner' })).toEqual([]);
    expect(getAssignableRoles({ role: 'owner' }, { role: 'member' }))
      .toEqual(['member', 'admin', 'owner']);
  });

  it('meringkas jumlah user aktif/nonaktif dan role', () => {
    const summary = summarizeUsers([
      { id: '1', role: 'owner', isActive: 1 },
      { id: '2', role: 'admin', isActive: true },
      { id: '3', role: 'member', isActive: 0 },
      { id: '4', role: 'member', isActive: false },
    ]);

    expect(summary.total).toBe(4);
    expect(summary.active).toBe(2);
    expect(summary.inactive).toBe(2);
    expect(summary.admins).toBe(2);
    expect(summary.byRole).toEqual({ owner: 1, admin: 1, member: 2 });
  });

  it('aman untuk payload kosong atau bukan array', () => {
    expect(summarizeUsers(null).total).toBe(0);
    expect(summarizeUsers(undefined).active).toBe(0);
  });
});
