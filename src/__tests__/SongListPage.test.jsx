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

  test('shows song counts in the band filter dropdown options', async () => {
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
          onSongMasteryUpdated={() => {}}
        />
      );
      await flushPromises();
    });

    const options = Array.from(container.querySelectorAll('select')[0].querySelectorAll('option')).map((option) => option.textContent);
    expect(options).toContain('Band One (2)');
    expect(options).toContain('Band Two (1)');
  });

  test('shows mood badge in normal and performance mode', async () => {
    const baseProps = {
      songs: [
        { id: 'song-1', title: 'Anthem', artist: 'Band A', key: 'C', tempo: '132', genre: 'Rock' },
      ],
      loading: false,
      error: null,
      onSongClick: () => {},
      onSongMasteryUpdated: () => {},
    };

    await act(async () => {
      root.render(<SongListPage {...baseProps} performanceMode={false} />);
      await flushPromises();
    });
    expect(container.querySelectorAll('.song-mood-badge').length).toBeGreaterThan(0);

    await act(async () => {
      root.render(<SongListPage {...baseProps} performanceMode={true} />);
      await flushPromises();
    });
    expect(container.querySelectorAll('.song-mood-badge').length).toBeGreaterThan(0);
  });
});
