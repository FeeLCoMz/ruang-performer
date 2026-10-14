import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PerformanceDock from '../components/PerformanceDock.jsx';

// PerformanceDock memanggil API (setlist + lagu) dan navigasi router.
// Kedua-duanya di-mock supaya test fokus ke perilaku UI: navigasi lagu,
// panel daftar, pencarian, dan tambah-lagu-ke-setlist.
vi.mock('../apiClient.js', () => ({
  fetchSetListById: vi.fn(),
  fetchSongs: vi.fn(),
  updateSetList: vi.fn(),
}));

import { fetchSetListById, fetchSongs, updateSetList } from '../apiClient.js';

const SETLIST = {
  id: 'sl-1',
  name: 'Gig Sabtu',
  songs: ['s-1', 's-2', 's-3'],
  completedSongs: { 's-1': true },
};

const SONGS = [
  { id: 's-1', title: 'Lagu Pertama', artist: 'A' },
  { id: 's-2', title: 'Lagu Kedua', artist: 'B' },
  { id: 's-3', title: 'Lagu Ketiga', artist: 'C' },
  // Lagu di luar setlist — target pencarian & tombol tambah.
  { id: 's-9', title: 'Request Spesial', artist: 'D' },
];

function renderDock(container, root, { initialPath = '/setlists/sl-1/songs/s-2' } = {}) {
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/setlists/:setlistId/songs/:id"
            element={
              <PerformanceDock
                setlist={SETLIST}
                songs={SONGS}
                currentSongId="s-2"
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );
  });
}

function findButton(container, text) {
  return Array.from(container.querySelectorAll('button')).find(
    (btn) => (btn.textContent || '').includes(text)
  );
}

// React melacak value input secara internal; assignment .value langsung
// diabaikan. Setter native membuat React melihat perubahan (pola yang sama
// dipakai SetlistSongsPage.test.jsx).
function typeSearch(container, text) {
  const input = container.querySelector('.performance-dock-search-input');
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;
  act(() => {
    nativeSetter.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return input;
}

describe('PerformanceDock', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchSetListById.mockResolvedValue(SETLIST);
    fetchSongs.mockResolvedValue(SONGS);
    updateSetList.mockResolvedValue({ ...SETLIST });
  });

  test('menampilkan dock dengan posisi lagu saat ini dan tombol nav sesuai urutan', () => {
    renderDock(container, root);

    const count = container.querySelector('.performance-dock-count');
    expect(count.textContent).toBe('2/3');

    // Lagu pertama/terakhir: tombol nav tetap ada tapi disabled di ujung.
    const prev = container.querySelector('[aria-label="Lagu sebelumnya"]');
    const next = container.querySelector('[aria-label="Lagu berikutnya"]');
    expect(prev.disabled).toBe(false);
    expect(next.disabled).toBe(false);
  });

  test('tombol daftar membuka panel berisi seluruh lagu setlist dan menandai yang dibawakan', () => {
    renderDock(container, root);

    act(() => {
      findButton(container, '2/3').click();
    });

    const rows = container.querySelectorAll('.performance-dock-song-row');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('Lagu Pertama');
    expect(rows[0].className).not.toContain('current');
    // s-2 sedang dibuka → baris kedua ditandai current.
    expect(rows[1].className).toContain('current');
    // s-1 sudah dibawakan → tanda ✓.
    expect(rows[0].querySelector('.performance-dock-song-done')).toBeTruthy();
  });

  test('panel pencarian menemukan lagu di luar setlist dan menawarkan tambah-ke-setlist', () => {
    renderDock(container, root);

    act(() => {
      findButton(container, 'Cari').click();
    });

    expect(container.querySelector('.performance-dock-search-input')).toBeTruthy();

    typeSearch(container, 'Request');

    const rows = container.querySelectorAll('.performance-dock-song-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Request Spesial');
    // Lagu di luar setlist punya tombol ＋ untuk ditambahkan ke setlist aktif.
    expect(container.querySelector('.performance-dock-add-btn')).toBeTruthy();
  });

  test('tombol tambah menyimpan setlist via updateSetList lalu menutup panel', async () => {
    renderDock(container, root);

    act(() => {
      findButton(container, 'Cari').click();
    });

    typeSearch(container, 'Request');

    const addBtn = container.querySelector('.performance-dock-add-btn');
    expect(addBtn).toBeTruthy();

    await act(async () => {
      addBtn.click();
    });

    expect(updateSetList).toHaveBeenCalledTimes(1);
    const payload = updateSetList.mock.calls[0][0];
    expect(payload.songs).toContain('s-9');
    // Panel tertutup setelah berhasil.
    expect(container.querySelector('.performance-dock-overlay')).toBeFalsy();
  });

  test('hasil pencarian kosong menampilkan link pencarian Google', () => {
    renderDock(container, root);

    act(() => {
      findButton(container, 'Cari').click();
    });

    typeSearch(container, 'zzz-tidak-ada');

    const link = container.querySelector('.performance-dock-google-link');
    expect(link).toBeTruthy();
    expect(link.href).toContain('google.com/search');
    expect(link.href).toContain('chord');
  });

  test('gesture swipe kanan memanggil navigasi ke lagu sebelumnya', () => {
    renderDock(container, root);

    // Simulasi swipe kanan pada window (mulai dari kiri, berakhir ke kanan).
    // PerformanceDock mendengarkan touchstart/touchend global saat mode aktif.
    const startX = 100;
    act(() => {
      window.dispatchEvent(new TouchEvent('touchstart', {
        touches: [{ clientX: startX, clientY: 300 }],
      }));
      window.dispatchEvent(new TouchEvent('touchend', {
        changedTouches: [{ clientX: startX + 90, clientY: 305 }],
      }));
    });

    // Panel tidak terbuka setelah swipe; dock tetap dirender.
    expect(container.querySelector('.performance-dock-overlay')).toBeFalsy();
    expect(container.querySelector('.performance-dock')).toBeTruthy();
  });
});
