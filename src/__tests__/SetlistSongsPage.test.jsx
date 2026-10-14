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
      ...overrides,
    };
  }

  test('search narrows the list and the header keeps only the primary action', async () => {
    const props = buildProps({
      songs: [
        { id: 'song-1', title: 'Lagu Sudah', artist: 'Artist A', key: 'C', tempo: '120', genre: 'Pop' },
        { id: 'song-2', title: 'Lagu Belum', artist: 'Artist B', key: 'G', tempo: '110', genre: 'Rock' },
      ],
    });

    await renderPage(root, props);

    // The artist / genre / completed dropdowns were removed on purpose: the
    // header now offers a single action plus a menu, and the text search is the
    // only filter left in the toolbar.
    expect(container.querySelector('select[aria-label="Filter status dibawakan"]')).toBeFalsy();
    const filterSelects = container.querySelectorAll('.filter-row select');
    const selectLabels = Array.from(filterSelects).map((el) => el.textContent || '');
    expect(selectLabels.some((text) => text.includes('Artis:'))).toBe(false);
    expect(selectLabels.some((text) => text.includes('Genre:'))).toBe(false);
    expect(selectLabels.some((text) => text.includes('Dibawakan:'))).toBe(false);

    // Only "Tambah Lagu" sits outside the menu, plus the performance toggle.
    const header = container.querySelector('.setlist-header-actions');
    const directButtons = Array.from(header.querySelectorAll(':scope > button')).map(
      (btn) => btn.textContent.trim(),
    );
    // Setelah tombol mode performance dihapus dari header setlist, hanya
    // "Tambah Lagu" yang tersisa di luar menu aksi.
    expect(directButtons).toEqual(['Tambah Lagu']);

    const moreMenu = header.querySelector('details.setlist-header-more');
    expect(moreMenu).toBeTruthy();
    const menuText = moreMenu.querySelector('.setlist-header-more-menu').textContent;
    expect(menuText).toContain('Bagikan');
    expect(menuText).toContain('Copy Setlist');

    // The search still filters.
    const searchInput = container.querySelector('.search-input-main');
    const nativeValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    ).set;
    await act(async () => {
      // React tracks the input's value internally, so assigning .value directly
      // is ignored. Going through the native setter makes React see the change.
      nativeValueSetter.call(searchInput, 'Sudah');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await flushPromises();
    });

    expect(findElementByText(container, 'Lagu Sudah')).toBeTruthy();
    expect(findElementByText(container, 'Lagu Belum')).toBeFalsy();
  });

  test('shows sequential autoplay control for setlist videos and starts the first song', async () => {
    const props = buildProps({
      songs: [
        { id: 'song-1', title: 'Lagu Sudah', artist: 'Artist A', key: 'C', tempo: '120', genre: 'Pop', youtubeId: 'abc123def45' },
        { id: 'song-2', title: 'Lagu Belum', artist: 'Artist B', key: 'G', tempo: '110', genre: 'Rock', youtubeId: 'xyz987uvw21' },
      ],
    });

    await renderPage(root, props);

    const autoplayButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Putar Berurutan') || button.getAttribute('aria-label') === 'Putar video setlist berurutan'
    );

    expect(autoplayButton).toBeTruthy();

    await act(async () => {
      autoplayButton.click();
      await flushPromises();
    });

    expect(findElementByText(container, 'Now Playing')).toBeTruthy();
    expect(findElementByText(container, 'Lagu Sudah')).toBeTruthy();
  });

  test('shows next/previous and loop controls while a setlist video is active', async () => {
    const props = buildProps({
      songs: [
        { id: 'song-1', title: 'Lagu Sudah', artist: 'Artist A', key: 'C', tempo: '120', genre: 'Pop', youtubeId: 'abc123def45' },
        { id: 'song-2', title: 'Lagu Belum', artist: 'Artist B', key: 'G', tempo: '110', genre: 'Rock', youtubeId: 'xyz987uvw21' },
      ],
    });

    await renderPage(root, props);

    const autoplayButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Putar Berurutan') || button.getAttribute('aria-label') === 'Putar video setlist berurutan'
    );

    await act(async () => {
      autoplayButton.click();
      await flushPromises();
    });

    expect(container.querySelector('button[aria-label="Video sebelumnya"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Video berikutnya"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Aktifkan loop playlist video"]')).toBeTruthy();
  });

  test('shows song key, tempo, and setlist usage metadata', async () => {
    await renderPage(root, buildProps());

    const metaBlocks = Array.from(container.querySelectorAll('.song-meta')).map((el) => el.textContent || '');
    expect(metaBlocks.length).toBeGreaterThan(0);
    expect(metaBlocks[0]).toContain('🎹 C');
    expect(metaBlocks[0]).toContain('⏱️ 120 BPM');
    expect(metaBlocks[0]).toContain('📋');
    expect(container.querySelectorAll('.song-mood-badge').length).toBeGreaterThan(0);
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

  test('share modal includes YouTube links in full format while keeping app link', async () => {
    const props = buildProps({
      setlists: [
        {
          id: 'setlist-1',
          name: 'Setlist Konser',
          userId: 'user-1',
          songs: ['song-1', 'song-2'],
          completedSongs: {},
          setlistSongMeta: {},
        },
      ],
      songs: [
        { id: 'song-1', title: 'Opening Song', artist: 'Artist A', key: 'C', tempo: '120', genre: 'Pop', youtubeId: 'abc123def45' },
        { id: 'song-2', title: 'Closing Song', artist: 'Artist B', key: 'G', tempo: '110', genre: 'Rock' },
      ],
    });

    await renderPage(root, props);

    const openShareButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Bagikan'));
    expect(openShareButton).toBeTruthy();

    await act(async () => {
      openShareButton.click();
      await flushPromises();
    });

    const shareTextarea = container.querySelector('textarea.modal-input');
    expect(shareTextarea).toBeTruthy();
    expect(shareTextarea.value).toContain('https://www.youtube.com/watch?v=abc123def45');
    expect(shareTextarea.value).toContain('/setlists/setlist-1');
    expect(shareTextarea.value).toContain('Lihat detail & chord:');
  });

  test('replaces the grouping dropdown with a hide-played-songs switch', async () => {
    const props = buildProps({
      setlists: [
        {
          id: 'setlist-1',
          name: 'Setlist Switch',
          userId: 'user-1',
          songs: ['song-1', 'song-2', 'song-3'],
          completedSongs: { 'song-2': true },
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

    // The sort and group dropdowns are gone: order always follows the user.
    expect(container.querySelector('select[aria-label="Kelompokkan daftar lagu"]')).toBeFalsy();
    const selects = Array.from(container.querySelectorAll('.filter-row select')).map(
      (s) => s.textContent || '',
    );
    expect(selects.some((t) => t.includes('Urutkan:'))).toBe(false);
    expect(selects.some((t) => t.includes('Kelompokkan:'))).toBe(false);

    const toggle = container.querySelector('#hide-played-songs');
    expect(toggle).toBeTruthy();
    expect(toggle.checked).toBe(false);

    // All three songs are listed while the switch is off.
    const titles = () =>
      Array.from(container.querySelectorAll('.song-item .song-title')).map((el) =>
        el.textContent.trim(),
      );
    expect(titles().length).toBe(3);

    await act(async () => {
      toggle.click();
      await flushPromises();
    });

    // Switching it on filters OUT the song already performed.
    const visible = titles();
    expect(visible.length).toBe(2);
    expect(visible.some((t) => t.startsWith('Beta'))).toBe(false);
    // And the order is still the user's own, not re-sorted.
    expect(visible[0].startsWith('Alpha')).toBe(true);
    expect(visible[1].startsWith('Gamma')).toBe(true);
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

    // The song NUMBER is the reorder control: one tap opens the prompt. Drag and
    // a separate handle were both removed (drag never fires on touch).
    expect(songRows[1].querySelector('.drag-handle-icon')).toBeFalsy();
    expect(songRows[1].querySelector('.song-order-edit-btn')).toBeFalsy();
    expect(songRows[1].getAttribute('draggable')).toBeFalsy();
    expect(songRows[1].querySelector('.song-rail')).toBeTruthy();

    const secondSongOrderButton = songRows[1].querySelector('.song-number-button');
    expect(secondSongOrderButton).toBeTruthy();
    // It must be an accessible, focusable control, not a decorative glyph.
    expect(secondSongOrderButton.tagName).toBe('BUTTON');
    expect(secondSongOrderButton.getAttribute('aria-label')).toContain('Lagu Dua');
    // And it must still read as the song's position.
    expect(secondSongOrderButton.textContent.trim()).toBe('2');

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