/**
 * POST /api/extract-chord
 * Fetch a page server-side (CORS bypass) and return its HTML.
 *
 * Uses the global `fetch` so the same code runs on Node 18+ (Vercel, local),
 * Jest (polyfilled in the test setup) and the Cloudflare Workers runtime.
 */

const FETCH_TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 3;

function normalizeUrl(raw) {
  let value = String(raw || '').trim();
  if (!value) return null;
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    value = `https://${value}`;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function fetchPage(urlObject) {
  let current = urlObject;
  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt += 1) {
    const response = await fetch(current.toString(), {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        accept: 'text/html,application/xhtml+xml',
      },
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout
        ? AbortSignal.timeout(FETCH_TIMEOUT_MS)
        : undefined,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return { status: response.status, html: '' };
      current = new URL(location, current);
      continue;
    }

    const html = await response.text();
    return { status: response.status, html };
  }
  throw new Error('Terlalu banyak redirect');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'URL diperlukan' });
    }

    const urlObject = normalizeUrl(url);
    if (!urlObject) {
      return res.status(400).json({ error: 'Format URL tidak valid' });
    }

    const { status, html } = await fetchPage(urlObject);
    if (status !== 200) {
      return res.status(400).json({ error: `Halaman tidak ditemukan (${status})` });
    }
    if (!html) {
      return res.status(400).json({ error: 'Halaman kosong atau tidak valid' });
    }

    return res.json({ html });
  } catch (error) {
    console.error('Extract chord error:', error.message);
    const isTimeout = /timeout|abort/i.test(error.message || '');
    return res.status(isTimeout ? 504 : 500).json({
      error: error.message || 'Gagal memproses URL',
    });
  }
}
