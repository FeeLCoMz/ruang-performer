import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SetlistSongsPage from '../pages/SetlistSongsPage.jsx';
import { flushPromises, findElementByText } from './helpers/domTestUtils.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'setlist-1' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { id: 'user-1', username: 'Tester' } }),
}));

vi.mock('../hooks/usePermission.js', () => ({
  usePermission: () => ({ user: { id: 'user-1' }, can: () => true }),
}));

vi.mock('../hooks/useMetronome.js', () => ({
  default: () => [false, vi.fn()],
}));

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../components/YouTubeViewer.jsx', () => ({
  default: () => null,
}));

async function renderPage(root, props) {
  await act(async () => {
    root.render(<SetlistSongsPage {...props} />);
    await flushPromises();
  });
}

describe('SetlistSongsPage', () => {
  let container;
  let root;
  let fetchSpy;
  let confirmSpy;
  let promptSpy;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockNavigate.mockReset();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) });
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('1');
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    fetchSpy.mockRestore();
    confirmSpy.mockRestore();
    promptSpy.mockRestore();
  });

  function buildProps(overrides = {}) {
    return {
      setlists: [
        {
          id: 'setlist-1',
          name: 'Setlist Malam Ini',
          userId: 'user-1',
          songs: ['song-1', 'song-2'],
          completedSongs: { 'song-1': true },
          setlistSongMeta: {},
        },
      ],
      songs: [
        { id: 'song-1', title: 'Lagu Sudah', artist: 'Artist A', key: 'C', tempo: '120', genre: 'Pop' },
        { id: 'song-2', title: 'Lagu Belum', artist: 'Artist B', key: 'G', tempo: '110', genre: 'Rock' },
      ],
      setSetlists: vi.fn(),
      setActiveSetlist: vi.fn(),
      loadingSetlists: false,
      userBandInfo: null,
      performanceMode: false,
      ...overrides,
    };
  }

  test('filters songs by completed status', async () => {
    const props = buildProps();

    await renderPage(root, props);

    const statusFilter = container.querySelector('select[aria-label="Filter status dibawakan"]');
    expect(statusFilter).toBeTruthy();

    await act(async () => {
      statusFilter.value = 'completed';
      statusFilter.dispatchEvent(new Event('change', { bubbles: true }));
      await flushPromises();
    });

    expect(findElementByText(container, 'Lagu Sudah')).toBeTruthy();
    expect(findElementByText(container, 'Lagu Belum')).toBeFalsy();

    await act(async () => {
      statusFilter.value = 'pending';
      statusFilter.dispatchEvent(new Event('change', { bubbles: true }));
      await flushPromises();
    });

    expect(findElementByText(container, 'Lagu Sudah')).toBeFalsy();
    expect(findElementByText(container, 'Lagu Belum')).toBeTruthy();
  });

  test('merges multiple source setlists at once without duplicate songs', async () => {
    const setSetlists = vi.fn();
    const props = buildProps({
      setSetlists,
      setlists: [
        {
          id: 'setlist-1',
          name: 'Setlist Malam Ini',
          userId: 'user-1',
          songs: ['song-1'],
          completedSongs: {},
          setlistSongMeta: {},
        },
        {
          id: 'setlist-2',
          name: 'Setlist Akustik',
          songs: ['song-2', 'song-3'],
          setlistSongMeta: {
            'song-2': { key: 'D' },
            'song-3': { tempo: '90' },
          },
        },
        {
          id: 'setlist-3',
          name: 'Setlist Encore',
          songs: ['song-3', 'song-4'],
          setlistSongMeta: {
            'song-3': { tempo: '95' },
            'song-4': { genre: 'Rock' },
          },
        },
      ],
      songs: [
        { id: 'song-1', title: 'Pembuka', artist: 'Artist A', key: 'C', tempo: '120', genre: 'Pop' },
        { id: 'song-2', title: 'Akustik 1', artist: 'Artist B', key: 'G', tempo: '110', genre: 'Rock' },
        { id: 'song-3', title: 'Akustik 2', artist: 'Artist C', key: 'A', tempo: '100', genre: 'Jazz' },
        { id: 'song-4', title: 'Encore', artist: 'Artist D', key: 'F', tempo: '130', genre: 'Funk' },
      ],
    });

    await renderPage(root, props);

    const openMergeButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Merge Setlist'));
    expect(openMergeButton).toBeTruthy();

    await act(async () => {
      openMergeButton.click();
      await flushPromises();
    });

    const sourceItems = Array.from(container.querySelectorAll('.song-list-item'));
    const akustikItem = sourceItems.find((item) => item.textContent.includes('Setlist Akustik'));
    const encoreItem = sourceItems.find((item) => item.textContent.includes('Setlist Encore'));
    expect(akustikItem).toBeTruthy();
    expect(encoreItem).toBeTruthy();

    await act(async () => {
      akustikItem.click();
      encoreItem.click();
      await flushPromises();
    });

    const mergeButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Merge Lagu'));
    expect(mergeButton.textContent).toContain('(2)');

    await act(async () => {
      mergeButton.click();
      await flushPromises();
    });

    expect(setSetlists).toHaveBeenCalled();
    const updater = setSetlists.mock.calls[0][0];
    const updatedSetlists = updater(props.setlists);
    expect(updatedSetlists[0].songs).toEqual(['song-1', 'song-2', 'song-3', 'song-4']);
    expect(updatedSetlists[0].setlistSongMeta).toEqual({
      'song-2': { key: 'D' },
      'song-3': { tempo: '90' },
      'song-4': { genre: 'Rock' },
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/setlists/setlist-1',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  test('deletes songs that are not marked completed', async () => {
    const setSetlists = vi.fn();
    const props = buildProps({
      setSetlists,
      setlists: [
        {
          id: 'setlist-1',
          name: 'Setlist Malam Ini',
          userId: 'user-1',
          songs: ['song-1', 'song-2', 'song-3'],
          completedSongs: { 'song-1': true },
          setlistSongMeta: {
            'song-1': { key: 'C' },
            'song-2': { key: 'G' },
            'song-3': { key: 'A' },
          },
        },
      ],
      songs: [
        { id: 'song-1', title: 'Lagu Jadi', artist: 'Artist A', key: 'C', tempo: '120', genre: 'Pop' },
        { id: 'song-2', title: 'Lagu Cadangan 1', artist: 'Artist B', key: 'G', tempo: '110', genre: 'Rock' },
        { id: 'song-3', title: 'Lagu Cadangan 2', artist: 'Artist C', key: 'A', tempo: '100', genre: 'Jazz' },
      ],
    });

    await renderPage(root, props);

    const deleteButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Hapus Belum Dibawakan'));
    expect(deleteButton).toBeTruthy();

    await act(async () => {
      deleteButton.click();
      await flushPromises();
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(setSetlists).toHaveBeenCalled();

    const updater = setSetlists.mock.calls[0][0];
    const updatedSetlists = updater(props.setlists);
    expect(updatedSetlists[0].songs).toEqual(['song-1']);
    expect(updatedSetlists[0].completedSongs).toEqual({ 'song-1': true });
    expect(updatedSetlists[0].setlistSongMeta).toEqual({ 'song-1': { key: 'C' } });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/setlists/setlist-1',
      expect.objectContaining({ method: 'PUT' })
    );
    expect(
      fetchSpy.mock.calls.some(([url]) => String(url).includes('/api/songs'))
    ).toBe(false);
  });

  test('quick add creates a missing song from add-to-setlist modal', async () => {
    const props = buildProps({
      setlists: [
        {
          id: 'setlist-1',
          name: 'Setlist Malam Ini',
          userId: 'user-1',
          songs: ['song-1', 'song-2'],
          completedSongs: {},
          setlistSongMeta: {},
        },
      ],
      songs: [
        { id: 'song-1', title: 'Lagu Lama 1', artist: 'Artist A', key: 'C', tempo: '120', genre: 'Pop' },
        { id: 'song-2', title: 'Lagu Lama 2', artist: 'Artist B', key: 'G', tempo: '110', genre: 'Rock' },
      ],
    });

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'song-quick-1' }),
    });

    await renderPage(root, props);

    const openAddButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Tambah Lagu'));
    expect(openAddButton).toBeTruthy();

    await act(async () => {
      openAddButton.click();
      await flushPromises();
    });

    const searchInput = container.querySelector('input[placeholder="Cari judul atau artist..."]');
    expect(searchInput).toBeTruthy();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(searchInput, 'Lagu Quick Baru');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await flushPromises();
      await flushPromises();
    });

    const quickAddButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Tambah cepat'));
    expect(quickAddButton).toBeTruthy();

    await act(async () => {
      quickAddButton.click();
      await flushPromises();
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/songs',
      expect.objectContaining({ method: 'POST' })
    );

    const createSongRequest = fetchSpy.mock.calls.find(([url]) => url === '/api/songs');
    expect(createSongRequest).toBeTruthy();
    expect(JSON.parse(createSongRequest[1].body)).toEqual(
      expect.objectContaining({ title: 'Lagu Quick Baru' })
    );

    const addToSetlistButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Tambah (1)'));
    expect(addToSetlistButton).toBeTruthy();
  });

  test('share modal supports sharing a specific session only', async () => {
    const props = buildProps({
      setlists: [
        {
          id: 'setlist-1',
          name: 'Setlist Konser',
          userId: 'user-1',
          songs: ['song-1', 'song-2', 'song-3'],
          completedSongs: {},
          setlistSongMeta: {
            'song-2': { sessionDividerName: 'Encore' },
          },
        },
      ],
      songs: [
        { id: 'song-1', title: 'Opening Song', artist: 'Artist A', key: 'C', tempo: '120', genre: 'Pop' },
        { id: 'song-2', title: 'Encore One', artist: 'Artist B', key: 'G', tempo: '110', genre: 'Rock' },
        { id: 'song-3', title: 'Encore Two', artist: 'Artist C', key: 'A', tempo: '100', genre: 'Jazz' },
      ],
    });

    await renderPage(root, props);

    const openShareButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Bagikan'));
    expect(openShareButton).toBeTruthy();

    await act(async () => {
      openShareButton.click();
      await flushPromises();
    });

    const sessionSelect = container.querySelector('select[aria-label="Pilih sesi bagikan"]');
    expect(sessionSelect).toBeTruthy();

    await act(async () => {
      sessionSelect.value = 'song-2';
      sessionSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await flushPromises();
    });

    const shareTextarea = container.querySelector('textarea.modal-input');
    expect(shareTextarea).toBeTruthy();
    expect(shareTextarea.value).toContain('📌 Sesi: Encore');
    expect(shareTextarea.value).toContain('Encore One');
    expect(shareTextarea.value).toContain('Encore Two');
    expect(shareTextarea.value).not.toContain('Opening Song');
  });

  test('groups songs by artist when grouping option is selected', async () => {
    const props = buildProps({
      setlists: [
        {
          id: 'setlist-1',
          name: 'Setlist Grup Artis',
          userId: 'user-1',
          songs: ['song-1', 'song-2', 'song-3'],
          completedSongs: {},
          setlistSongMeta: {},
        },
      ],
      songs: [
        { id: 'song-1', title: 'Alpha', artist: 'Artist B', key: 'C', tempo: '120', genre: 'Pop' },
        { id: 'song-2', title: 'Beta', artist: 'Artist A', key: 'G', tempo: '110', genre: 'Rock' },
        { id: 'song-3', title: 'Gamma', artist: 'Artist A', key: 'D', tempo: '100', genre: 'Rock' },
      ],
    });

    await renderPage(root, props);

    const groupSelect = container.querySelector('select[aria-label="Kelompokkan daftar lagu"]');
    expect(groupSelect).toBeTruthy();

    await act(async () => {
      groupSelect.value = 'artist';
      groupSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await flushPromises();
    });

    const groupHeaders = Array.from(container.querySelectorAll('.setlist-group-header')).map((el) => el.textContent || '');
    expect(groupHeaders.some((text) => text.includes('Artist A'))).toBe(true);
    expect(groupHeaders.some((text) => text.includes('Artist B'))).toBe(true);
  });

  test('edits song order number and persists new custom order', async () => {
    const setSetlists = vi.fn();
    const props = buildProps({
      setSetlists,
      setlists: [
        {
          id: 'setlist-1',
          name: 'Setlist Reorder',
          userId: 'user-1',
          songs: ['song-1', 'song-2', 'song-3'],
          completedSongs: {},
          setlistSongMeta: {},
        },
      ],
      songs: [
        { id: 'song-1', title: 'Lagu Satu', artist: 'Artist A', key: 'C', tempo: '120', genre: 'Pop' },
        { id: 'song-2', title: 'Lagu Dua', artist: 'Artist B', key: 'G', tempo: '110', genre: 'Rock' },
        { id: 'song-3', title: 'Lagu Tiga', artist: 'Artist C', key: 'D', tempo: '105', genre: 'Jazz' },
      ],
    });

    promptSpy.mockReturnValueOnce('1');

    await renderPage(root, props);

    const songRows = container.querySelectorAll('.song-item');
    expect(songRows.length).toBe(3);

    const secondSongOrderButton = songRows[1].querySelector('.song-order-edit-btn');
    expect(secondSongOrderButton).toBeTruthy();

    await act(async () => {
      secondSongOrderButton.click();
      await flushPromises();
    });

    expect(window.prompt).toHaveBeenCalled();
    expect(setSetlists).toHaveBeenCalled();

    const updater = setSetlists.mock.calls[0][0];
    const updatedSetlists = updater(props.setlists);
    expect(updatedSetlists[0].songs).toEqual(['song-2', 'song-1', 'song-3']);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/setlists/setlist-1',
      expect.objectContaining({ method: 'PUT' })
    );
  });
});