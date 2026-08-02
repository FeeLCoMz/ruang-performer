import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SongListPage from '../pages/SongListPage.jsx';
import * as apiClient from '../apiClient.js';
import { flushPromises } from './helpers/domTestUtils.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { id: 'user-1', username: 'Tester' } }),
}));

vi.mock('../utils/permissionUtils.js', () => ({
  canPerformAction: () => true,
  PERMISSIONS: {
    SONG_EDIT: 'song.edit',
    SONG_DELETE: 'song.delete',
    SONG_CREATE: 'song.create',
  },
}));

vi.mock('../components/PlusIcon.jsx', () => ({ default: () => <span /> }));
vi.mock('../components/EditIcon.jsx', () => ({ default: () => <span /> }));
vi.mock('../components/DeleteIcon.jsx', () => ({ default: () => <span /> }));
vi.mock('../components/YouTubeViewer.jsx', () => ({ default: () => null }));
vi.mock('../components/VoiceSearchButton.jsx', () => ({ default: () => null }));
vi.mock('../components/LoadingSkeleton.jsx', () => ({ SongListSkeleton: () => <div /> }));
vi.mock('../hooks/useMetronome.js', () => ({ default: () => [false, vi.fn()] }));
vi.mock('../utils/metaTagsUtil.js', () => ({
  updatePageMeta: vi.fn(),
  pageMetadata: { songs: {} },
}));

describe('SongListPage trending actions', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockNavigate.mockReset();
    vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.spyOn(apiClient, 'addSong').mockResolvedValue({ id: 'new-song-id' });
    vi.spyOn(apiClient, 'fetchSetLists').mockResolvedValue([]);
    vi.spyOn(apiClient, 'fetchBands').mockResolvedValue([]);
    vi.spyOn(apiClient, 'updateSongMastery').mockResolvedValue({});
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  test('opens YouTube video and adds a trending song', async () => {
    const onTrendingSongAdded = vi.fn();

    await act(async () => {
      root.render(
        <SongListPage
          songs={[]}
          loading={false}
          error={null}
          onSongClick={() => {}}
          onSongMasteryUpdated={() => {}}
          onTrendingSongAdded={onTrendingSongAdded}
          trendingSongs={[
            { videoId: 'abc123', title: 'Trending Song', channelTitle: 'Test Channel' },
          ]}
        />
      );
      await flushPromises();
    });

    const toggleButton = Array.from(container.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Buka panel trending');
    expect(toggleButton).toBeTruthy();

    await act(async () => {
      toggleButton.click();
      await flushPromises();
    });

    const openButton = Array.from(container.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Buka video YouTube: Trending Song');
    expect(openButton).toBeTruthy();

    await act(async () => {
      openButton.click();
      await flushPromises();
    });

    expect(window.open).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abc123', '_blank', 'noopener,noreferrer');

    const addButton = Array.from(container.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Tambah ke daftar: Trending Song');
    expect(addButton).toBeTruthy();

    await act(async () => {
      addButton.click();
      await flushPromises();
    });

    expect(apiClient.addSong).toHaveBeenCalled();
    expect(onTrendingSongAdded).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Trending Song',
      artist: 'Test Channel',
      youtubeId: 'abc123',
    }));
    expect(container.textContent).toContain('Lagu berhasil ditambahkan');
  });

  test('marks trending songs that already exist in the song list', async () => {
    await act(async () => {
      root.render(
        <SongListPage
          songs={[
            { id: 'existing-song', title: 'Trending Song', artist: 'Test Channel', youtubeId: 'abc123' },
          ]}
          loading={false}
          error={null}
          onSongClick={() => {}}
          onSongMasteryUpdated={() => {}}
          trendingSongs={[
            { videoId: 'abc123', title: 'Trending Song', channelTitle: 'Test Channel' },
          ]}
        />
      );
      await flushPromises();
    });

    const toggleButton = Array.from(container.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Buka panel trending');
    expect(toggleButton).toBeTruthy();

    await act(async () => {
      toggleButton.click();
      await flushPromises();
    });

    expect(container.textContent).toContain('Sudah ada');
  });
});
