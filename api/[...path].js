/**
 * Satu-satunya Serverless Function untuk seluruh API.
 *
 * Vercel Hobby menghitung SETIAP file .js di folder api/ sebagai satu
 * function (batas 12), jadi semua handler asli pindah ke server/handlers/ dan
 * file ini yang melayani /api/* dengan routing berbasis path.
 *
 * Vercel:  vercel.json mengarahkan /api/(.*) ke file ini. Path asli dikirim di
 *          header x-original-url (rewrite di Vercel tidak memindahkan query
 *          param seperti ?id=...&path=mastery).
 * Express: api/index.js memanggil handler ini sebagai fallback setelah route
 *          khususnya sendiri.
 *
 * Urutan penting:
 *   - /api/songs/bulk  → songs.js, segmen "bulk" (POST array)
 *   - /api/songs/:id/mastery serta bentuk rewrite ?id=&path=mastery → songs.js
 *   - /api/songs/:id   → song-id.js (GET/PUT/PATCH/DELETE)
 *   - /api/auth/(login|register) → handler masing-masing
 *   - /api/auth/me     → auth-me.js
 */
import songsHandler from '../server/handlers/songs.js';
import songIdHandler from '../server/handlers/song-id.js';
import setlistsHandler from '../server/handlers/setlists.js';
import bandsHandler from '../server/handlers/bands.js';
import bandIdHandler from '../server/handlers/band-id.js';
import bandMembersHandler from '../server/handlers/band-members.js';
import eventsHandler from '../server/handlers/events.js';
import authMeHandler from '../server/handlers/auth-me.js';
import authLoginHandler from '../server/handlers/auth-login.js';
import authRegisterHandler from '../server/handlers/auth-register.js';
import authChangePasswordHandler from '../server/handlers/auth-change-password.js';
import authDeleteAccountHandler from '../server/handlers/auth-delete-account.js';
import authForgotPasswordHandler from '../server/handlers/auth-forgot-password.js';
import authResetPasswordHandler from '../server/handlers/auth-reset-password.js';
import authAuditLogsHandler from '../server/handlers/auth-audit-logs.js';
import { verifyToken } from '../server/_auth.js';

const ORIGINAL_URL_HEADER = 'x-original-url';
const SONG_ID_METHODS = new Set(['GET', 'PUT', 'PATCH', 'DELETE']);

function readJson(req) {
  if (req.body) return req.body;
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function resolveUrl(req) {
  const forwarded = req.headers?.[ORIGINAL_URL_HEADER];
  const raw = typeof forwarded === 'string' && forwarded
    ? forwarded
    : req.originalUrl || req.url || '/';
  const [pathname, search = ''] = String(raw).split('?');
  return { pathname: pathname.replace(/\/+$/, '') || '/', search };
}

function mergeQuery(req, search) {
  const extra = {};
  if (search) {
    new URLSearchParams(search).forEach((value, key) => {
      extra[key] = value;
    });
  }
  req.query = { ...(req.query || {}), ...extra };
}

async function dispatch(req, res) {
  const { pathname, search } = resolveUrl(req);
  const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  mergeQuery(req, search);

  const [resource, second, third] = segments;

  // ---- Auth ---------------------------------------------------------------
  if (resource === 'auth') {
    if (req.method === 'POST' && second === 'login') return authLoginHandler(req, res);
    if (req.method === 'POST' && second === 'register') return authRegisterHandler(req, res);
    if (second === 'me') return authMeHandler(req, res);
    if (req.method === 'POST' && second === 'change-password') return authChangePasswordHandler(req, res);
    if (req.method === 'DELETE' && second === 'delete-account') return authDeleteAccountHandler(req, res);
    if (req.method === 'POST' && second === 'forgot-password') return authForgotPasswordHandler(req, res);
    if (req.method === 'POST' && second === 'reset-password') return authResetPasswordHandler(req, res);
    if (req.method === 'GET' && second === 'user-audit-logs') return authAuditLogsHandler(req, res);
    res.status(404).json({ error: 'Endpoint tidak ditemukan' });
    return;
  }

  // ---- Songs --------------------------------------------------------------
  if (resource === 'songs') {
    const isBulk = second === 'bulk' && req.method === 'POST';
    const isMasteryPath = second && third === 'mastery';
    const isMasteryRewrite = second === 'index.js' && req.query?.path === 'mastery';

    if (isBulk || isMasteryPath || isMasteryRewrite || !second) {
      return songsHandler(req, res);
    }

    // /api/songs/:id  (juga /api/songs/[id].js hasil rewrite lama)
    const songId = second === '[id].js' ? req.query?.id : second;
    if (songId && SONG_ID_METHODS.has(req.method)) {
      req.params = { ...(req.params || {}), id: String(songId) };
      req.query = { ...(req.query || {}), id: String(songId) };
      return songIdHandler(req, res);
    }

    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ---- Setlists -----------------------------------------------------------
  if (resource === 'setlists') return setlistsHandler(req, res);

  // ---- Bands --------------------------------------------------------------
  if (resource === 'bands') {
    if (second && third === 'members') {
      req.params = { ...(req.params || {}), id: second, userId: segments[3] || undefined };
      return bandMembersHandler(req, res);
    }
    if (second && SONG_ID_METHODS.has(req.method)) {
      req.params = { ...(req.params || {}), id: second };
      req.query = { ...(req.query || {}), id: second };
      return bandIdHandler(req, res);
    }
    return bandsHandler(req, res);
  }

  // ---- Gigs / events ------------------------------------------------------
  if (resource === 'events') return eventsHandler(req, res);

  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
}

export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');

    // Sama seperti api/index.js: di mode test token dianggap valid.
    if (process.env.NODE_ENV !== 'test' && !verifyToken(req, res)) return;

    // Express sudah mem-parse body; di Vercel body mentah perlu dibaca sekali.
    if (!req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        req.body = await readJson(req);
      } catch {
        res.status(400).json({ error: 'Body JSON tidak valid' });
        return;
      }
    }

    // Rate limiter butuh IP asli dari proxy Vercel.
    const forwardedFor = req.headers?.['x-forwarded-for'];
    if (forwardedFor && !req.ip) req.ip = String(forwardedFor).split(',')[0].trim();

    await dispatch(req, res);
  } catch (error) {
    console.error('API dispatch error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', message: error?.message });
    }
  }
}
