import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

/**
 * Modal pemilih video YouTube:
 *   - otomatis mencari saat dibuka, memakai judul + artis,
 *   - tidak memanggil API bila query kosong,
 *   - hanya sekali per pembukaan (bukan setiap render).
 */

const mockSearch = vi.fn();
vi.mock('../apiClient.js', () => ({
  searchYoutubeVideos: (...args) => mockSearch(...args),
}));

import YoutubeVideoPickerModal from '../modules/ai-autofill/YoutubeVideoPickerModal.jsx';
import { flushPromises } from './helpers/domTestUtils.js';

describe('YoutubeVideoPickerModal', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    mockSearch.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.removeChild(container);
  });

  const render = async (props) => {
    await act(async () => {
      root.render(<YoutubeVideoPickerModal open {...props} />);
      await flushPromises();
      await flushPromises();
    });
  };

  test('otomatis mencari berdasarkan judul + artis saat dibuka', async () => {
    mockSearch.mockResolvedValue({ videos: [{ videoId: 'abc12345678', title: 'Imagine', channelTitle: 'JL' }] });

    await render({ initialQuery: 'Imagine John Lennon', onClose: vi.fn(), onSelect: vi.fn() });

    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith({ q: 'Imagine John Lennon', max: 8 });
    expect(container.textContent).toContain('Imagine');
  });

  test('tidak memanggil API bila judul & artis kosong', async () => {
    await render({ initialQuery: '', onClose: vi.fn(), onSelect: vi.fn() });
    expect(mockSearch).not.toHaveBeenCalled();
    expect(container.textContent).toContain('ubah kata kunci');
  });

  test('kolom tempel URL sudah dihapus dari modal', async () => {
    mockSearch.mockResolvedValue({ videos: [] });
    await render({ initialQuery: 'Queen', onClose: vi.fn(), onSelect: vi.fn() });
    expect(container.querySelector('#youtube-picker-url')).toBeNull();
    expect(container.querySelector('.youtube-picker-paste')).toBeNull();
  });

  test('menampilkan keterangan query yang dipakai dari judul & artis', async () => {
    mockSearch.mockResolvedValue({ videos: [] });
    await render({ initialQuery: 'Imagine John Lennon', onClose: vi.fn(), onSelect: vi.fn() });
    const hint = container.querySelector('.youtube-picker-query-hint');
    expect(hint?.textContent).toContain('Imagine John Lennon');
    const input = container.querySelector('.youtube-picker-search input');
    expect(input.value).toBe('Imagine John Lennon');
  });

  test('tidak mencari ulang saat modal masih terbuka', async () => {
    mockSearch.mockResolvedValue({ videos: [] });
    await render({ initialQuery: 'Queen', onClose: vi.fn(), onSelect: vi.fn() });
    // Render ulang dengan props yang sama (mis. parent re-render).
    await act(async () => {
      root.render(<YoutubeVideoPickerModal open initialQuery="Queen" onClose={vi.fn()} onSelect={vi.fn()} />);
      await flushPromises();
    });
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  test('memilih video memanggil onSelect dengan videoId', async () => {
    mockSearch.mockResolvedValue({ videos: [{ videoId: 'xyz98765432', title: 'Lagu', channelTitle: 'Ch' }] });
    const onSelect = vi.fn();
    await render({ initialQuery: 'Lagu', onClose: vi.fn(), onSelect });

    const item = container.querySelector('.youtube-picker-item');
    expect(item).toBeTruthy();
    await act(async () => {
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ videoId: 'xyz98765432' }));
  });
});
