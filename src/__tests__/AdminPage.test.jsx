import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react'; // wajib: JSX di proyek ini memakai transform klasik
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { flushPromises, findElementByText } from './helpers/domTestUtils.js';

/**
 * Halaman khusus Administrator (/admin) hanya bisa dibuka role akun
 * owner/admin, dan SEMUA fitur administrasi (kelola user, backup/restore,
 * modul, audit log) tersedia langsung di halaman ini untuk keduanya.
 */

const mockGetAllUsers = vi.fn();
const mockGetAuditLogs = vi.fn();
let mockUser = { user: { userId: 'u1', username: 'andi', role: 'owner' } };

vi.mock('../apiClient.js', () => ({
  getAllUsers: (...args) => mockGetAllUsers(...args),
  getAuditLogs: (...args) => mockGetAuditLogs(...args),
}));

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => mockUser,
}));

vi.mock('../hooks/useModulesEnabled.js', () => ({
  useModulesEnabled: () => ({ statuses: { 'midi-cue': true }, setEnabled: vi.fn() }),
}));

vi.mock('../modules/registry.js', () => ({
  getModulesWithStatus: () => [
    { id: 'midi-cue', name: 'MIDI Cue', icon: '🎼', description: 'desc' },
  ],
  getAdminOnlyModulesWithStatus: () => [
    { id: 'audit-log', name: 'Audit Log', icon: '🔍', description: 'desc', adminOnly: true },
  ],
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Panel backup/restore memakai hook modul; cukup distub di test ini.
vi.mock('../modules/backup-restore/useSqlBackup.js', () => ({
  useSqlBackup: () => ({ backingUp: false, backupError: null, backupSuccess: null, handleBackup: vi.fn() }),
}));
vi.mock('../modules/backup-restore/useSqlRestore.js', () => ({
  useSqlRestore: () => ({
    restoring: false,
    restoreError: null,
    restoreSuccess: null,
    sqlInputRef: { current: null },
    handleRestore: vi.fn(),
  }),
}));

import AdminPage from '../pages/admin/AdminPage.jsx';

describe('AdminPage', () => {
  let container;
  let root;

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    mockGetAllUsers.mockReset();
    mockGetAuditLogs.mockReset();
    mockUser = { user: { userId: 'u1', username: 'andi', role: 'owner' } };
    mockGetAllUsers.mockResolvedValue({
      users: [
        { id: 'u1', role: 'owner', isActive: 1 },
        { id: 'u2', role: 'member', isActive: 0 },
        { id: 'u3', role: 'admin', isActive: 1 },
      ],
    });
    mockGetAuditLogs.mockResolvedValue({
      logs: [{ id: 'l1', action: 'USER_LOGIN', username: 'andi', createdAt: '2026-01-01T00:00:00Z', status: 'success' }],
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<AdminPage />);
    });
    await act(async () => {
      await flushPromises();
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  test('member ditolak dan tidak memuat data admin', async () => {
    mockUser = { user: { userId: 'u9', username: 'budi', role: 'member' } };
    mockGetAllUsers.mockClear();
    mockGetAuditLogs.mockClear();
    await act(async () => {
      root.render(<AdminPage key="member" />);
    });
    await act(async () => {
      await flushPromises();
    });

    expect(container.textContent).toContain('hanya dapat diakses oleh Administrator');
    expect(mockGetAllUsers).not.toHaveBeenCalled();
    expect(mockGetAuditLogs).not.toHaveBeenCalled();
  });

  test('owner melihat ringkasan akun, modul, dan aktivitas', () => {
    expect(container.textContent).toContain('Total user');
    expect(container.textContent).toContain('Admin & Owner');
    expect(container.textContent).toContain('MIDI Cue');
    expect(findElementByText(container, 'User Login')).toBeTruthy();
    expect(mockGetAllUsers).toHaveBeenCalled();
    expect(mockGetAuditLogs).toHaveBeenCalled();
  });

  test('owner melihat modul khusus administrator yang dipisahkan dari modul pengguna', () => {
    expect(container.textContent).toContain('Modul Khusus Administrator');
    expect(container.textContent).toContain('Audit Log');
  });

  test('admin mendapat akses ke semua fitur admin di halaman ini', async () => {
    mockUser = { user: { userId: 'u3', username: 'sari', role: 'admin' } };
    mockGetAllUsers.mockClear();
    mockGetAuditLogs.mockClear();
    await act(async () => {
      root.render(<AdminPage key="admin" />);
    });
    await act(async () => {
      await flushPromises();
    });

    // Ringkasan akun, kelola user, backup/restore, audit log, modul — semua tampil.
    expect(container.textContent).toContain('Total user');
    expect(container.textContent).toContain('Kelola User');
    expect(container.textContent).toContain('Backup Database');
    expect(findElementByText(container, 'Audit Log')).toBeTruthy();
    expect(container.textContent).toContain('Modul Khusus Administrator');
    expect(container.textContent).not.toContain('Khusus Owner aplikasi');
    expect(mockGetAllUsers).toHaveBeenCalled();
    expect(mockGetAuditLogs).toHaveBeenCalled();
  });

  test('admin tidak bisa mengubah role atau menghapus akun owner', async () => {
    mockUser = { user: { userId: 'u3', username: 'sari', role: 'admin' } };
    await act(async () => {
      root.render(<AdminPage key="admin-policy" />);
    });
    await act(async () => {
      await flushPromises();
    });

    // Baris owner (u1): tidak ada <select> role maupun tombol Hapus yang aktif.
    const ownerRow = container.querySelector('#admin-users tbody tr');
    expect(ownerRow).toBeTruthy();
    expect(ownerRow.textContent).toContain('Owner');
    expect(ownerRow.querySelector('select')).toBeNull();
    const deleteBtn = Array.from(ownerRow.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Hapus',
    );
    expect(deleteBtn.disabled).toBe(true);
  });
});
