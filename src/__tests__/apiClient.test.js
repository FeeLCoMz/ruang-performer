// Tests for the shared request() pipeline and the thin wrappers in
// src/apiClient.js. global.fetch and the IndexedDB offline cache are both
// mocked so these run fast and never touch the network or a real database.

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the IndexedDB-backed cache before importing the client that uses it.
vi.mock('../utils/offlineCache.js', () => ({
  cacheSong: vi.fn().mockResolvedValue(undefined),
  cacheSongs: vi.fn().mockResolvedValue(undefined),
  getAllSongs: vi.fn().mockResolvedValue([]),
  getSong: vi.fn().mockResolvedValue(null),
  cacheSetlist: vi.fn().mockResolvedValue(undefined),
  cacheSetlists: vi.fn().mockResolvedValue(undefined),
  getAllSetlists: vi.fn().mockResolvedValue([]),
  getSetlist: vi.fn().mockResolvedValue(null),
}));

import {
  login,
  register,
  getCurrentUser,
  addSong,
  updateSong,
  deleteSong,
  fetchSongs,
  fetchSongById,
  fetchSetLists,
  fetchSetListById,
  deleteSetList,
  deleteGig,
  deleteBand,
  backupDatabase,
  fetchGigs,
  fetchPopularSongs,
  transcribeAudio,
  askAI,
} from '../apiClient.js';

import * as offlineCache from '../utils/offlineCache.js';
import { saveToken, removeToken } from '../utils/auth.js';

/** Build a fetch Response-alike. */
function makeResponse({ ok = true, status = 200, json, text } = {}) {
  return {
    ok,
    status,
    json: async () => (json !== undefined ? json : {}),
    text: async () => (text !== undefined ? text : ''),
  };
}

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock;
  removeToken();
  vi.clearAllMocks();
});

afterEach(() => {
  removeToken();
  vi.restoreAllMocks();
});

describe('request pipeline: URL building and headers', () => {
  test('prefixes relative paths with /api', async () => {
    fetchMock.mockResolvedValue(makeResponse({ json: { id: '1' } }));

    await addSong({ title: 'Halo' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/songs');
  });

  test('sends the auth header when a token is stored', async () => {
    saveToken('test-token');
    fetchMock.mockResolvedValue(makeResponse({ json: [] }));

    await getCurrentUser();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  test('omits the auth header for login and register', async () => {
    fetchMock.mockResolvedValue(makeResponse({ json: { success: true } }));

    await login('a@b.c', 'pw');
    await register('a@b.c', 'user', 'pw');

    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers.Authorization).toBeUndefined();
    }
  });

  test('passes raw bodies through without a JSON content type', async () => {
    fetchMock.mockResolvedValue(makeResponse({ json: { transcript: 'la la' } }));

    const audio = new Blob(['x']);
    await transcribeAudio(audio);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/ai/transcribe');
    // The wrapper must hand fetch a FormData, not a JSON string.
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('audio')).toBeTruthy();
    // fetch must be left to set its own multipart boundary.
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  test('serialises plain object bodies to JSON', async () => {
    fetchMock.mockResolvedValue(makeResponse({ json: {} }));

    await askAI({ prompt: 'hi' });

    const [, init] = fetchMock.mock.calls[0];
    expect(typeof init.body).toBe('string');
    expect(JSON.parse(init.body)).toEqual({ prompt: 'hi' });
  });

  test('encodes query parameters for fetchGigs', async () => {
    fetchMock.mockResolvedValue(makeResponse({ json: [] }));

    await fetchGigs('band 1');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/events/gig?bandId=band%201');
  });
});

describe('request pipeline: error messages', () => {
  test('prefers the server-provided error message', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ ok: false, status: 400, json: { error: 'Judul lagu wajib diisi' } })
    );

    await expect(addSong({})).rejects.toThrow('Judul lagu wajib diisi');
  });

  test('falls back to the caller default when the server gives no message', async () => {
    fetchMock.mockResolvedValue(makeResponse({ ok: false, status: 500, json: {} }));

    await expect(addSong({})).rejects.toThrow('Failed to add song');
  });

  test('does not crash when an error body is not valid JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
      text: async () => '<html>Bad gateway</html>',
    });

    await expect(updateSong('1', {})).rejects.toThrow('Failed to update song');
  });

  test('surfaces the server message for a text response endpoint', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ ok: false, status: 500, text: 'Backup gagal: database terkunci' })
    );

    await expect(backupDatabase()).rejects.toThrow('Backup gagal: database terkunci');
  });

  test('propagates a network failure unchanged', async () => {
    fetchMock.mockRejectedValue(new Error('Network down'));

    await expect(getCurrentUser()).rejects.toThrow('Network down');
  });
});

describe('204 No Content handling', () => {
  test('deleteSong returns undefined for a 204', async () => {
    fetchMock.mockResolvedValue(makeResponse({ status: 204 }));

    await expect(deleteSong('1')).resolves.toBeUndefined();
  });

  test('deleteSetList returns the id for a 204', async () => {
    fetchMock.mockResolvedValue(makeResponse({ status: 204 }));

    await expect(deleteSetList('abc')).resolves.toEqual({ id: 'abc' });
  });

  test('deleteGig returns success true for a 204', async () => {
    fetchMock.mockResolvedValue(makeResponse({ status: 204 }));

    await expect(deleteGig('g1')).resolves.toEqual({ success: true });
  });

  test('204 does not mask a real error status', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ ok: false, status: 404, json: { error: 'Lagu tidak ditemukan' } })
    );

    await expect(deleteSong('1')).rejects.toThrow('Lagu tidak ditemukan');
  });
});

describe('offline cache fallback', () => {
  test('fetchSongs returns cached songs when the network fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    offlineCache.getAllSongs.mockResolvedValue([
      { id: '1', title: 'Cached A', bandId: 'b1' },
      { id: '2', title: 'Cached B', bandId: 'b2' },
    ]);

    const songs = await fetchSongs();

    expect(songs.map((s) => s.title)).toEqual(['Cached A', 'Cached B']);
  });

  test('fetchSongs filters the cache by bandId', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    offlineCache.getAllSongs.mockResolvedValue([
      { id: '1', title: 'A', bandId: 'b1' },
      { id: '2', title: 'B', bandId: 'b2' },
    ]);

    const songs = await fetchSongs({ bandId: 'b2' });

    expect(songs).toHaveLength(1);
    expect(songs[0].title).toBe('B');
  });

  test('fetchSongs rethrows when the cache is also empty', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    offlineCache.getAllSongs.mockResolvedValue([]);

    await expect(fetchSongs()).rejects.toThrow('offline');
  });

  test('fetchSongs caches a successful response', async () => {
    fetchMock.mockResolvedValue(makeResponse({ json: [{ id: '1', title: 'Fresh' }] }));

    await fetchSongs();

    expect(offlineCache.cacheSongs).toHaveBeenCalledWith([{ id: '1', title: 'Fresh' }]);
  });

  test('fetchSongById falls back to the cached song', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    offlineCache.getSong.mockResolvedValue({ id: '9', title: 'Cached Song' });

    await expect(fetchSongById('9')).resolves.toEqual({ id: '9', title: 'Cached Song' });
    expect(offlineCache.getSong).toHaveBeenCalledWith('9');
  });

  test('fetchSetListById falls back to the cached setlist', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    offlineCache.getSetlist.mockResolvedValue({ id: 's1', songs: ['a'] });

    await expect(fetchSetListById('s1')).resolves.toEqual({ id: 's1', songs: ['a'] });
  });

  test('fetchSetLists does not fall back when summary is requested', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    offlineCache.getAllSetlists.mockResolvedValue([{ id: 's1' }]);

    await expect(fetchSetLists({ summary: true })).rejects.toThrow('offline');
    expect(offlineCache.getAllSetlists).not.toHaveBeenCalled();
  });

  test('fetchSetLists returns cached setlists without summary', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    offlineCache.getAllSetlists.mockResolvedValue([{ id: 's1' }]);

    await expect(fetchSetLists()).resolves.toEqual([{ id: 's1' }]);
  });
});

describe('response normalisation', () => {
  test('fetchSongs unwraps a { songs } envelope', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ json: { songs: [{ id: '1' }], trending: [{ videoId: 'v1' }] } })
    );

    await expect(fetchSongs({ includeTrending: true })).resolves.toEqual({
      songs: [{ id: '1' }],
      trending: [{ videoId: 'v1' }],
    });
  });

  test('fetchSongs tolerates a missing envelope', async () => {
    fetchMock.mockResolvedValue(makeResponse({ json: {} }));

    await expect(fetchSongs()).resolves.toEqual([]);
  });

  test('fetchPopularSongs maps trending into youtubeSongs', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({
        json: { songs: [], trending: [{ videoId: 'vid', title: 'T', channelTitle: 'C' }] },
      })
    );

    const { youtubeSongs } = await fetchPopularSongs();

    expect(youtubeSongs).toEqual([
      { id: 'vid', youtubeId: 'vid', title: 'T', artist: 'C', thumbnail: null, viewCount: null, publishedAt: null },
    ]);
  });

  test('deleteBand still parses a JSON body on success', async () => {
    fetchMock.mockResolvedValue(makeResponse({ json: { deleted: true } }));

    await expect(deleteBand('b1')).resolves.toEqual({ deleted: true });
  });
});