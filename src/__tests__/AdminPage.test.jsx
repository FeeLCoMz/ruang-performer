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
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Panel backup/restore memakai hook modul; cukup distub di test ini.
vi.mock('../pages/admin/backup-restore/useSqlBackup.js', () => ({
  useSqlBackup: () => ({ backingUp: false, backupError: null, backupSuccess: null, handleBackup: vi.fn() }),
}));
vi.mock('../pages/admin/backup-restore/useSqlRestore.js', () => ({
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
    // Tab aktif disimpan di URL hash — bersihkan agar test lain mulai dari Ringkasan.
    window.location.hash = '';
  });

  /** Pindah tab lewat tombol navigasi (tab aktif tercermin di URL hash). */
  async function openTab(tabId) {
    const tab = container.querySelector(`#admin-tab-${tabId}`);
    expect(tab).toBeTruthy();
    await act(async () => {
      tab.click();
    });
    await act(async () => {
      await flushPromises();
    });
  }

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

  test('owner melihat ringkasan akun', () => {
    expect(container.textContent).toContain('Total user');
    expect(container.textContent).toContain('Admin & Owner');
    expect(mockGetAllUsers).toHaveBeenCalled();
  });

  test('semua tab tersedia untuk owner', () => {
    const tabs = Array.from(container.querySelectorAll('[role="tab"]')).map((tab) => tab.textContent);
    expect(tabs).toHaveLength(4);
    expect(tabs.join(' ')).toContain('Ringkasan');
    expect(tabs.join(' ')).toContain('User');
    expect(tabs.join(' ')).toContain('Backup');
    expect(tabs.join(' ')).toContain('Audit Log');
  });

  test('URL hash membuka tab yang dituju langsung', async () => {
    window.location.hash = 'backup';

    await act(async () => {
      root.render(<AdminPage key="deep-link" />);
    });
    await act(async () => {
      await flushPromises();
    });

    expect(container.querySelector('#admin-tab-backup').getAttribute('aria-selected')).toBe('true');
    expect(container.textContent).toContain('Backup Database');
  });

  test('tab audit log memuat aktivitas saat dibuka', async () => {
    // Tab audit belum dibuka: endpoint audit belum dipanggil.
    expect(mockGetAuditLogs).not.toHaveBeenCalled();

    await openTab('audit');

    expect(findElementByText(container, 'User Login')).toBeTruthy();
    expect(mockGetAuditLogs).toHaveBeenCalled();
    expect(window.location.hash).toBe('#audit');
  });

  test('fitur admin bukan modul', () => {
    expect(container.textContent).not.toContain('Modul Khusus Administrator');
  });

  test('halaman admin tidak menampilkan panel modul aplikasi', () => {
    // Toggle modul pengguna hanya ada di halaman /modules, bukan /admin.
    expect(container.querySelector('#admin-modules')).toBeNull();
    expect(container.querySelector('.admin-modules-list')).toBeNull();
    expect(container.textContent).not.toContain('Modul Aplikasi');
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

    // Ringkasan akun tampil di tab default.
    expect(container.textContent).toContain('Total user');
    expect(container.textContent).not.toContain('Khusus Owner aplikasi');
    expect(mockGetAllUsers).toHaveBeenCalled();

    // Kelola user.
    await openTab('users');
    expect(container.textContent).toContain('Kelola User');

    // Backup/restore.
    await openTab('backup');
    expect(container.textContent).toContain('Backup Database');

    // Audit log.
    await openTab('audit');
    expect(findElementByText(container, 'Audit Log')).toBeTruthy();
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

    await openTab('users');

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
