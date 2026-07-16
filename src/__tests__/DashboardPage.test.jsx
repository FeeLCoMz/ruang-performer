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

  test('Given popular songs fails, When user retries, Then error clears and songs render', async () => {
    apiClient.fetchPopularSongs
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        youtubeSongs: [
          {
            id: 'song-1',
            youtubeId: 'abc123',
            title: 'Song Alpha',
            artist: 'Artist One',
          },
        ],
      });

    await renderDashboard(root);

    const errorMessage = findElementByText(container, 'Lagu populer YouTube gagal dimuat. Silakan coba lagi.');
    expect(errorMessage).toBeTruthy();

    const retryButton = findButtonByText(container, 'Coba Lagi');
    expect(retryButton).toBeTruthy();

    await act(async () => {
      retryButton.click();
      await flushPromises();
      await flushPromises();
    });

    const clearedError = findElementByText(container, 'Lagu populer YouTube gagal dimuat. Silakan coba lagi.');
    expect(clearedError).toBeFalsy();

    const loadedSong = findElementByText(container, 'Song Alpha');
    expect(loadedSong).toBeTruthy();
    expect(apiClient.fetchPopularSongs).toHaveBeenCalledTimes(2);
  });

  test('Given popular song item, When clicked, Then opens YouTube link with noopener and noreferrer', async () => {
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
