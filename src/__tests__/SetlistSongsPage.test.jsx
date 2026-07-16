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

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockNavigate.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('filters songs by completed status', async () => {
    const props = {
      setlists: [
        {
          id: 'setlist-1',
          name: 'Setlist Malam Ini',
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
    };

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
});