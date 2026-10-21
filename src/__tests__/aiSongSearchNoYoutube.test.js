import { describe, test, expect, beforeEach, vi } from 'vitest';

/**
 * Perilaku /api/ai/song-search setelah pencarian YouTube DIHAPUS dari AI Autofill:
 *   - youtubeId selalu null (video dipilih manual lewat modal "Cari video"),
 *   - tidak ada panggilan YouTube API sama sekali,
 *   - kegagalan Gemini tidak disimpan ke cache.
 */

process.env.NODE_ENV = 'test';
delete process.env.GEMINI_API_KEY;

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

describe('api/ai.js song-search tanpa YouTube', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.GEMINI_API_KEY;
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ items: [{ id: { videoId: 'HARUSNYA_TIDAK_DIPAKAI' } }] }),
    }));
  });

  // Cache di api/ai.js bersifat module-level dan bertahan antar-test; judul unik
  // mencegah test saling menimpa (misalnya `cached: true` dari test sebelumnya).
  const uniqueTitle = (label) => `${label} ${Date.now()}-${Math.random().toString(36).slice(2)}`;

  test('youtubeId selalu null dan YouTube API tidak dipanggil', async () => {
    const result = await callSongSearch({ title: uniqueTitle('Lagu A'), artist: 'Artis' });
    expect(result.youtubeId).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test('tidak ada debug YouTube yang membingungkan pengguna', async () => {
    const result = await callSongSearch({ title: uniqueTitle('Lagu B'), artist: 'Artis' });
    expect(result.debug?.youtubeKeyMissing).toBeUndefined();
    expect(result.debug?.youtubeStatus).toBeUndefined();
    expect(result.debug?.youtubeResults).toBeUndefined();
  });

  test('respons tetap 200 dengan chord links utuh', async () => {
    const result = await callSongSearch({ title: uniqueTitle('Lagu C'), artist: 'Artis C' });
    expect(result.artist).toBe('Artis C');
    expect(Array.isArray(result.chordLinks)).toBe(true);
    expect(result.chordLinks.length).toBeGreaterThan(0);
  });

  test('tanpa GEMINI_API_KEY tidak ada metadata dari Gemini', async () => {
    delete process.env.GEMINI_API_KEY;
    const result = await callSongSearch({ title: uniqueTitle('Lagu tanpa gemini') });
    expect(result.debug.geminiModel).toBeUndefined();
    expect(result.key).toBeNull();
    expect(result.tempo).toBeNull();
  });
});
