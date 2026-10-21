import { describe, it, expect } from 'vitest';
import {
  getAdminOnlyModulesWithStatus,
  getModulesWithStatus,
  getVisibleModules,
} from '../modules/registry.js';

/**
 * Modul khusus Administrator (Backup & Restore, Audit Log) tidak boleh muncul
 * di halaman Modul pengguna — pengaturannya ada di halaman /admin.
 */
describe('registry — pemisahan modul admin', () => {
  it('modul khusus administrator ditandai adminOnly', () => {
    const adminIds = getAdminOnlyModulesWithStatus().map((mod) => mod.id).sort();
    expect(adminIds).toEqual(['audit-log', 'backup-restore']);
    getAdminOnlyModulesWithStatus().forEach((mod) => expect(mod.adminOnly).toBe(true));
  });

  it('daftar modul pengguna tidak memuat modul khusus administrator', () => {
    const visibleIds = getVisibleModules().map((mod) => mod.id);
    expect(visibleIds).not.toContain('audit-log');
    expect(visibleIds).not.toContain('backup-restore');
    expect(visibleIds).toContain('midi-cue');
  });

  it('jumlah modul pengguna + admin sama dengan seluruh registry', () => {
    expect(getVisibleModules().length + getAdminOnlyModulesWithStatus().length)
      .toBe(getModulesWithStatus().length);
  });

  it('modul pengguna menyertakan status aktif', () => {
    getVisibleModules().forEach((mod) => expect(typeof mod.enabled).toBe('boolean'));
  });
});
