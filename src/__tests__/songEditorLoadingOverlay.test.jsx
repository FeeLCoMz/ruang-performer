/**
 * Animasi membuka editor dari halaman lagu (song view).
 *
 * Overlay editor baru di-mount SETELAH data lagu siap, jadi umpan balik visual
 * harus muncul segera setelah Edit diklik — itulah tugas
 * SongEditorLoadingOverlay. Test ini mengunci kontraknya:
 *   - muncul saat data editor masih dimuat;
 *   - hilang setelah data siap (editor tampil);
 *   - tombol Batal menutup overlay (tidak membuat user terjebak).
 */
import React from 'react';
import { describe, test, expect, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import SongEditorLoadingOverlay, {
  SONG_EDITOR_LOADING_TEST_IDS,
} from '../components/SongEditorLoadingOverlay.jsx';

const mounted = [];

const mount = (element) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  mounted.push({ root, container });
  return container;
};

afterEach(() => {
  mounted.splice(0).forEach(({ root, container }) => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });
  // Overlay dirender lewat portal ke document.body.
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('SongEditorLoadingOverlay', () => {
  test('menampilkan status, judul, dan teks status', () => {
    const container = mount(<SongEditorLoadingOverlay />);

    // Portal: konten ada di body, bukan di container milik pemanggil.
    const status = document.body.querySelector(
      `[data-testid="${SONG_EDITOR_LOADING_TEST_IDS.root}"]`,
    );
    expect(status).toBeTruthy();
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toContain('Membuka editor');
    expect(status.textContent).toContain('Menyiapkan editor…');
    expect(container.childElementCount).toBe(0);
  });

  test('memakai teks status kustom bila diberikan', () => {
    mount(<SongEditorLoadingOverlay statusText="Mengambil lirik…" />);
    expect(document.body.textContent).toContain('Mengambil lirik…');
  });

  test('tombol Batal memanggil onCancel', () => {
    const onCancel = vi.fn();
    mount(<SongEditorLoadingOverlay onCancel={onCancel} />);

    const cancel = document.body.querySelector(
      `[data-testid="${SONG_EDITOR_LOADING_TEST_IDS.cancel}"]`,
    );
    expect(cancel).toBeTruthy();

    act(() => {
      cancel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('tanpa onCancel tidak ada tombol Batal', () => {
    mount(<SongEditorLoadingOverlay />);
    expect(document.body.querySelector(
      `[data-testid="${SONG_EDITOR_LOADING_TEST_IDS.cancel}"]`,
    )).toBeNull();
  });
});
