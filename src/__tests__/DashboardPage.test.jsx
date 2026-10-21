import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import DashboardPage from '../pages/DashboardPage.jsx';
import {
  flushPromises,
  findElementByText,
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

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
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

  test('Given slow background requests, When dashboard loads, Then summary stats render immediately', async () => {
    const deferredSetlists = createDeferred();
    const deferredBands = createDeferred();

    apiClient.fetchSetLists.mockImplementation(() => deferredSetlists.promise);
    apiClient.fetchBands.mockImplementation(() => deferredBands.promise);
    apiClient.fetchSongs.mockResolvedValue({ songs: [], trending: [] });
    apiClient.fetchGigs.mockResolvedValue([]);

    const renderPromise = act(async () => {
      root.render(<DashboardPage />);
      await flushPromises();
    });

    await renderPromise;

    expect(findElementByText(container, '0')).toBeTruthy();

    deferredSetlists.resolve([]);
    deferredBands.resolve([]);
    await act(async () => {
      await flushPromises();
    });
  });
});
