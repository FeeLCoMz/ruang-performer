import { describe, it, expect } from 'vitest';
import { MODULES_REGISTRY, getModulesWithStatus } from '../modules/registry.js';
import { ADMIN_MODULES } from '../utils/adminAccess.js';

/**
 * Fitur khusus Administrator (Backup & Restore, Audit Log) BUKAN modul:
 * tidak boleh didaftarkan di registry modul sehingga tidak punya toggle on/off
 * dan tidak muncul di halaman Modul — fitur itu selalu aktif di /admin.
 */
describe('registry — fitur admin dipisahkan dari modul', () => {
  it('registry tidak memuat modul khusus administrator', () => {
    const ids = MODULES_REGISTRY.map((mod) => mod.id);
    expect(ids).not.toContain('audit-log');
    expect(ids).not.toContain('backup-restore');
  });

  it('tidak ada entri registry bertanda adminOnly', () => {
    expect(MODULES_REGISTRY.some((mod) => mod.adminOnly)).toBe(false);
  });

  it('daftar ADMIN_MODULES berisi kedua fitur admin default', () => {
    const ids = ADMIN_MODULES.map((mod) => mod.id).sort();
    expect(ids).toEqual(['audit-log', 'backup-restore', 'user-management']);
  });

  it('setiap modul pengguna tetap menyertakan status aktif', () => {
    const modules = getModulesWithStatus();
    expect(modules.length).toBe(MODULES_REGISTRY.length);
    modules.forEach((mod) => expect(typeof mod.enabled).toBe('boolean'));
  });
});
