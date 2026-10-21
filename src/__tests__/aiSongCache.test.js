import { describe, test, expect, beforeEach, vi } from 'vitest';

/**
 * Cache song-info di api/ai.js:
 *   - hanya menyimpan hasil yang punya youtubeId,
 *   - dibatasi jumlah entri (LRU), jadi tidak tumbuh tanpa batas,
 *   - kedaluwarsa setelah TTL.
 *
 * Sangat sulit diuji lewat HTTP karena cache bersifat module-level; modul
 * di-import ulang tiap test dengan environment yang dikendalikan.
 */

process.env.NODE_ENV = 'test';
process.env.VITE_YOUTUBE_API_KEY = 'dummy-key';
delete process.env.GEMINI_API_KEY; // supaya tidak ada panggilan Gemini berbayar

const youtubeResponse = (videoId) => ({
  ok: true,
  status: 200,
  json: async () => ({ items: videoId ? [{ id: { videoId } }] : [] }),
});

async function callSongSearch(body) {
  const { default: handler } = await import('../../api/[...path].js');
  const req = {
    method: 'POST',
    url: '/api/ai/song-search',
    originalUrl: '/api/ai/song-search',
    headers: {},
    query: {},
    body,
    on() {},
  };
  const res = {
    headersSent: false,
    statusCode: 200,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; this.headersSent = true; return this; },
  };
  await handler(req, res);
  return res.payload || {};
}

describe('api/ai.js song info cache', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.GEMINI_API_KEY;
    process.env.VITE_YOUTUBE_API_KEY = 'dummy-key';
    globalThis.fetch = vi.fn(async () => youtubeResponse('ABCdefGHIjk'));
  });

  test('hasil sukses disimpan dan dipakai ulang', async () => {
    const first = await callSongSearch({ title: 'Lagu A', artist: 'Artis' });
    expect(first.youtubeId).toBe('ABCdefGHIjk');
    expect(first.cached).toBeUndefined();

    const second = await callSongSearch({ title: 'Lagu A', artist: 'Artis' });
    expect(second.cached).toBe(true);
    expect(second.youtubeId).toBe('ABCdefGHIjk');
  });

  test('hasil tanpa youtubeId TIDAK di-cache', async () => {
    globalThis.fetch = vi.fn(async () => youtubeResponse(null));

    const first = await callSongSearch({ title: 'Lagu B' });
    expect(first.youtubeId).toBeNull();

    // Panggilan kedua harus benar-benar mencari lagi (bukan dari cache).
    const second = await callSongSearch({ title: 'Lagu B' });
    expect(second.cached).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  test('kegagalan YouTube (403) tidak di-cache permanen', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ error: { message: 'quotaExceeded' } }),
    }));

    const first = await callSongSearch({ title: 'Lagu C' });
    expect(first.youtubeId).toBeNull();
    expect(first.debug.youtubeStatus).toBe(403);

    const second = await callSongSearch({ title: 'Lagu C' });
    expect(second.cached).toBeUndefined();
    expect(second.debug.youtubeStatus).toBe(403);
  });

  test('cache dibatasi dan membuang entri tertua', async () => {
    // 200 entri maksimum; lewati dengan 210 judul unik.
    for (let i = 0; i < 210; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await callSongSearch({ title: `Lagu unik ${i}` });
    }

    // Entri paling awal sudah dibuang → pencarian ulang harus memanggil fetch.
    const fetchCallsBefore = globalThis.fetch.mock.calls.length;
    const result = await callSongSearch({ title: 'Lagu unik 0' });
    expect(result.cached).toBeUndefined();
    expect(globalThis.fetch.mock.calls.length).toBe(fetchCallsBefore + 1);

    // Entri terbaru masih tersimpan.
    const recent = await callSongSearch({ title: 'Lagu unik 209' });
    expect(recent.cached).toBe(true);
  });
});
