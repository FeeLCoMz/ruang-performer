import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import DashboardPage from '../pages/DashboardPage.jsx';
import {
  flushPromises,
  findElementByText,
  findButtonByText,
  findClickableItemByText,
} from './helpers/domTestUtils.js';
import { applyDefaultDashboardApiMocks } from './helpers/dashboardApiMocks.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { username: 'Tester' } }),
}));

vi.mock('../apiClient.js', () => ({
  fetchSetLists: vi.fn(),
  fetchBands: vi.fn(),
  fetchSongs: vi.fn(),
  fetchGigs: vi.fn(),
  fetchPopularSongs: vi.fn(),
}));

import * as apiClient from '../apiClient.js';

async function renderDashboard(root) {
  await act(async () => {
    root.render(<DashboardPage />);
    await flushPromises();
    await flushPromises();
  });
}

describe('DashboardPage', () => {
  let container;
  let root;
  let openSpy;

  test('Given songs payload is an object, When dashboard loads, Then total songs count uses the songs array', async () => {
    apiClient.fetchSongs.mockResolvedValue({ songs: [{ id: '1' }, { id: '2' }], trending: [] });
    apiClient.fetchSetLists.mockResolvedValue([]);
    apiClient.fetchBands.mockResolvedValue([]);
    apiClient.fetchGigs.mockResolvedValue([]);
    apiClient.fetchPopularSongs.mockResolvedValue({ youtubeSongs: [] });

    await renderDashboard(root);

    const songCount = findElementByText(container, '2');
    expect(songCount).toBeTruthy();
  });

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockNavigate.mockReset();
    vi.clearAllMocks();
    applyDefaultDashboardApiMocks(apiClient);

    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    openSpy.mockRestore();
  });

  test('Given popular songs are empty, When user retries, Then songs render', async () => {
    apiClient.fetchSongs.mockResolvedValue({ songs: [], trending: [] });

    await renderDashboard(root);

    const emptyState = findElementByText(container, 'Tidak dapat memuat lagu populer YouTube');
    expect(emptyState).toBeTruthy();

    const retryButton = findButtonByText(container, 'Coba Lagi');
    expect(retryButton).toBeTruthy();

    apiClient.fetchSongs.mockResolvedValue({ songs: [], trending: [{ id: 'song-1', youtubeId: 'abc123', title: 'Song Alpha', artist: 'Artist One' }] });

    await act(async () => {
      retryButton.click();
      await flushPromises();
      await flushPromises();
    });

    const loadedSong = findElementByText(container, 'Song Alpha');
    expect(loadedSong).toBeTruthy();
  });

  test('Given popular song item, When clicked, Then opens YouTube link with noopener and noreferrer', async () => {
    apiClient.fetchSongs.mockResolvedValue({
      songs: [],
      trending: [
        {
          id: 'song-2',
          youtubeId: 'safe123',
          title: 'Safe Song',
          artist: 'Secure Artist',
        },
      ],
    });
    apiClient.fetchPopularSongs.mockResolvedValue({
      youtubeSongs: [
        {
          id: 'song-2',
          youtubeId: 'safe123',
          title: 'Safe Song',
          artist: 'Secure Artist',
        },
      ],
    });

    await renderDashboard(root);

    const clickableItem = findClickableItemByText(container, 'Safe Song');
    expect(clickableItem).toBeTruthy();

    act(() => {
      clickableItem.click();
    });

    expect(openSpy).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=safe123',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
