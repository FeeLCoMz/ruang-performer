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

vi.mock('../components/SongMediaPanel.jsx', () => ({ default: () => null }));
vi.mock('../modules/voice-search/VoiceSearchButton.jsx', () => ({ default: () => null }));
vi.mock('../components/LoadingSkeleton.jsx', () => ({ SongListSkeleton: () => <div /> }));
vi.mock('../utils/metaTagsUtil.js', () => ({
  updatePageMeta: vi.fn(),
  pageMetadata: { songs: {} },
}));

describe('SongListPage', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockNavigate.mockReset();
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

  test('shows the sort dropdown options', async () => {
    await act(async () => {
      root.render(
        <SongListPage
          songs={[
            { id: 'song-1', title: 'Anthem', bandId: 'band-1', bandName: 'Band One', artist: 'Artist 1' },
            { id: 'song-2', title: 'Second', bandId: 'band-1', bandName: 'Band One', artist: 'Artist 2' },
            { id: 'song-3', title: 'Third', bandId: 'band-2', bandName: 'Band Two', artist: 'Artist 3' },
          ]}
          loading={false}
          error={null}
          onSongClick={() => {}}
        />
      );
      await flushPromises();
    });

    const options = Array.from(container.querySelectorAll('select')[0].querySelectorAll('option')).map((option) => option.textContent);
    expect(options).toContain('Judul');
    expect(options).toContain('Artis');
  });

  test('shows mood badge on each song row', async () => {
    const baseProps = {
      songs: [
        { id: 'song-1', title: 'Anthem', artist: 'Band A', key: 'C', tempo: '132', genre: 'Rock' },
      ],
      loading: false,
      error: null,
      onSongClick: () => {},
    };

    await act(async () => {
      root.render(<SongListPage {...baseProps} />);
      await flushPromises();
    });
    expect(container.querySelectorAll('.song-mood-badge').length).toBeGreaterThan(0);
  });

  test('title, artist, key, and tempo are always rendered as core facts', async () => {
    await act(async () => {
      root.render(
        <SongListPage
          songs={[
            {
              id: 'song-1',
              title: 'Anthem Malam',
              artist: 'Band A',
              key: 'Am',
              tempo: '132',
              genre: 'Rock',
              contributor: 'Rina',
            },
          ]}
          loading={false}
          error={null}
          onSongClick={() => {}}
        />
      );
      await flushPromises();
    });

    expect(container.querySelector('.song-fact-title')?.textContent).toContain('Anthem Malam');
    expect(container.querySelector('.song-fact-artist')?.textContent).toContain('Band A');
    expect(container.querySelector('.song-fact-key')?.textContent).toContain('Am');
    expect(container.querySelector('.song-fact-tempo')?.textContent).toContain('132');
  });

  test('search and actions are labelled for screen readers', async () => {
    await act(async () => {
      root.render(
        <SongListPage
          songs={[{ id: 'song-1', title: 'Anthem', artist: 'Band A', key: 'C', tempo: '132' }]}
          loading={false}
          error={null}
          onSongClick={() => {}}
        />
      );
      await flushPromises();
    });

    expect(container.querySelector('input.search-input-main')?.getAttribute('aria-label')).toBeTruthy();

    // Baris lagu bisa dibuka dengan keyboard, bukan hanya klik mouse.
    const card = container.querySelector('.song-item');
    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('tabindex')).toBe('0');
    await act(async () => {
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await flushPromises();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/songs/view/song-1');
  });
});
