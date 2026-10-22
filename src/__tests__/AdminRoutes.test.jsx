import { describe, test, expect, afterEach } from 'vitest';
import React from 'react'; // wajib: JSX di proyek ini memakai transform klasik
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { flushPromises } from './helpers/domTestUtils.js';
import { ADMIN_MODULES } from '../utils/adminAccess.js';

/**
 * Rute lama yang sudah digabung ke halaman Administrator harus tetap bisa
 * dibuka lewat bookmark: pengguna dialihkan ke tab yang tepat di /admin.
 *
 * Redirect dicerminkan persis seperti di App.jsx; komponen tujuan diganti
 * penanda karena halaman admin butuh auth.
 */

function AdminMarker() {
  const location = useLocation();
  return (
    <div data-testid="admin-marker">
      {location.pathname}
      {location.hash}
    </div>
  );
}

describe('rute admin', () => {
  let container;
  let root;

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
      root = null;
    }
    container?.remove();
    container = null;
  });

  async function renderAt(path) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/backup-restore" element={<Navigate to="/admin#backup" replace />} />
            <Route path="/admin" element={<AdminMarker />} />
          </Routes>
        </MemoryRouter>,
      );
      await flushPromises();
    });

    return container.textContent;
  }

  test('/backup-restore dialihkan ke tab Backup di halaman admin', async () => {
    const text = await renderAt('/backup-restore');

    expect(container.querySelector('[data-testid="admin-marker"]')).toBeTruthy();
    expect(text).toContain('/admin');
    expect(text).toContain('#backup');
  });

  test('ADMIN_MODULES tidak lagi menunjuk ke rute /backup-restore yang sudah dihapus', () => {
    const backup = ADMIN_MODULES.find((mod) => mod.id === 'backup-restore');
    expect(backup).toBeTruthy();
    expect(backup.path).toBe('/admin#backup');
    expect(ADMIN_MODULES.some((mod) => mod.path === '/backup-restore')).toBe(false);
  });
});
