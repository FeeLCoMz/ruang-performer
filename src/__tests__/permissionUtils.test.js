import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isRoleHigherThan,
  getPermissionsForRole,
  resolveUserBandRole
} from '../utils/permissionUtils.js';

describe('permissionUtils', () => {
  it('should return correct permissions for owner', () => {
    expect(getPermissionsForRole('owner')).toContain(PERMISSIONS.BAND_CREATE);
    expect(getPermissionsForRole('owner')).toContain(PERMISSIONS.SETLIST_DELETE);
    expect(getPermissionsForRole('owner')).toContain(PERMISSIONS.ADMIN_MANAGE_ROLES);
  });

  it('should validate single permission', () => {
    expect(hasPermission('admin', PERMISSIONS.BAND_EDIT)).toBe(true);
    expect(hasPermission('member', PERMISSIONS.BAND_EDIT)).toBe(false);
  });

  it('should validate all permissions', () => {
    expect(hasAllPermissions('owner', [PERMISSIONS.BAND_CREATE, PERMISSIONS.BAND_EDIT])).toBe(true);
    expect(hasAllPermissions('admin', [PERMISSIONS.BAND_EDIT, PERMISSIONS.BAND_DELETE])).toBe(false);
  });

  it('should validate any permission', () => {
    expect(hasAnyPermission('admin', [PERMISSIONS.BAND_EDIT, PERMISSIONS.BAND_DELETE])).toBe(true);
    expect(hasAnyPermission('member', [PERMISSIONS.BAND_EDIT, PERMISSIONS.BAND_DELETE])).toBe(false);
  });

  it('should compare role hierarchy', () => {
    expect(isRoleHigherThan('owner', 'admin')).toBe(true);
    expect(isRoleHigherThan('admin', 'member')).toBe(true);
    expect(isRoleHigherThan('member', 'owner')).toBe(false);
  });

  it('should resolve admin role from multi-band membership for setlist management', () => {
    const memberships = [
      { bandId: 'band-1', role: 'member' },
      { bandId: 'band-2', role: 'admin' }
    ];

    const role = resolveUserBandRole(memberships, 'band-2');
    expect(role).toBe('admin');
    expect(hasPermission(role, PERMISSIONS.SETLIST_EDIT)).toBe(true);
    expect(hasPermission(role, PERMISSIONS.SETLIST_CREATE)).toBe(true);
  });
});
