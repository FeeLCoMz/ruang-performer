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

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockNavigate.mockReset();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    fetchSpy.mockRestore();
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
});