/**
 * ai-youtube-search.js
 *
 * GET /api/ai/youtube-search?q=...&max=8
 *
 * Pencarian video YouTube untuk dipilih manual oleh pengguna (modal
 * "Cari video" pada editor lagu). Mengembalikan beberapa hasil agar user
 * menentukan sendiri video yang benar — bukan menebak satu hasil otomatis.
 */
import { verifyToken } from '../_auth.js';

const MAX_RESULTS = 8;
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();

function getApiKey() {
  return process.env.VITE_YOUTUBE_API_KEY
    || process.env.YOUTUBE_API_KEY
    || process.env.rz_YOUTUBE_API_KEY
    || process.env.RZ_YOUTUBE_API_KEY;
}

function readCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.items;
}

function writeCache(key, items) {
  cache.set(key, { items, savedAt: Date.now() });
  while (cache.size > 100) {
    cache.delete(cache.keys().next().value);
  }
}

export default async function handler(req, res) {
  if (!verifyToken(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawQuery = String(req.query?.q || '').trim();
  if (!rawQuery) {
    return res.status(400).json({ error: 'Query pencarian kosong' });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(503).json({
      error: 'Kunci YouTube API belum diset di server',
      hint: 'Set VITE_YOUTUBE_API_KEY atau YOUTUBE_API_KEY.',
    });
  }

  const requestedMax = Number.parseInt(req.query?.max, 10);
  const maxResults = Number.isFinite(requestedMax)
    ? Math.min(Math.max(requestedMax, 1), MAX_RESULTS)
    : MAX_RESULTS;

  const cacheKey = `${rawQuery.toLowerCase()}|${maxResults}`;
  const cached = readCache(cacheKey);
  if (cached) {
    return res.status(200).json({ query: rawQuery, videos: cached, cached: true });
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', String(maxResults));
    url.searchParams.set('q', rawQuery);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.error?.message || response.statusText || `HTTP ${response.status}`;
      // 403 umumnya quota habis / kunci tidak diizinkan.
      return res.status(response.status === 403 ? 429 : 502).json({
        error: response.status === 403
          ? 'Kuota YouTube API habis atau kunci tidak diizinkan'
          : 'Pencarian YouTube gagal',
        detail: message,
      });
    }

    const data = await response.json();
    const videos = (Array.isArray(data?.items) ? data.items : []).map((item) => ({
      videoId: item?.id?.videoId || null,
      title: item?.snippet?.title || '',
      channelTitle: item?.snippet?.channelTitle || '',
      publishedAt: item?.snippet?.publishedAt || null,
      thumbnail: item?.snippet?.thumbnails?.medium?.url
        || item?.snippet?.thumbnails?.default?.url
        || null,
    })).filter((video) => video.videoId);

    writeCache(cacheKey, videos);
    return res.status(200).json({ query: rawQuery, videos });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? 'Pencarian YouTube timeout (8 detik)' : 'Pencarian YouTube gagal',
      detail: error?.message || String(error),
    });
  }
}
