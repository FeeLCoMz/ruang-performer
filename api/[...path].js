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
import authLogoutHandler from '../server/handlers/auth-logout.js';
import usersHandler from '../server/handlers/users.js';
import userIdHandler from '../server/handlers/user-id.js';
import userResetPasswordHandler from '../server/handlers/user-reset-password.js';
import toolsHandler from '../server/handlers/tools.js';
import toolsBackupHandler from '../server/handlers/tools-backup.js';
import toolsRestoreHandler from '../server/handlers/tools-restore.js';
import auditLogsHandler from '../server/handlers/audit-logs.js';
import settingsHandler from '../server/handlers/settings.js';
// AI (AI Autofill + AI Chord & Sheet Music Transcriber). File-nya tetap di
// api/ai.js, jadi modul ini ikut di-bundle ke function dan tidak di-ignore.
import aiHandler from './ai.js';
import aiUsageHandler from '../server/handlers/ai-usage.js';
import aiYoutubeSearchHandler from '../server/handlers/ai-youtube-search.js';
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
  const raw = (typeof forwarded === 'string' && forwarded)
    ? forwarded
    : (req.originalUrl || req.url || '/');
  const [rawPath, search = ''] = String(raw).split('?');
  let pathname = (rawPath || '/').replace(/\/+$/, '') || '/';

  // Vercel bisa memberi path internal function (/api/[...path].js); path rute
  // asli tetap ada di header x-original-url. Kalau header tidak dipakai,
  // coba pulihkan dari req.query.path yang diisi Vercel? Tidak — gunakan
  // /api sebagai fallback agar auth tetap dianggap rute API.
  if (pathname.includes('[...')) pathname = '/api';
  return { pathname, search };
}

/** Segmen rute dari path (tanpa prefix /api) atau dari format rewrite lama. */
function routeSegments(pathname) {
  return pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
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
  const { search } = resolveUrl(req);
  const segments = Array.isArray(req.__segments) && req.__segments.length > 0
    ? req.__segments
    : routeSegments(resolveUrl(req).pathname);
  mergeQuery(req, search);

  const [resource, second, third] = segments;

  // ---- Auth ---------------------------------------------------------------
  if (resource === 'auth') {
    if (req.method === 'POST' && second === 'login') return authLoginHandler(req, res);
    if (req.method === 'POST' && second === 'register') return authRegisterHandler(req, res);
    if (second === 'me') return authMeHandler(req, res);
    if (req.method === 'POST' && second === 'change-password') return authChangePasswordHandler(req, res);
    if (req.method === 'POST' && second === 'logout') return authLogoutHandler(req, res);
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

  // ---- Users (owner only; handler memeriksa role) -------------------------
  if (resource === 'users') {
    if (!second) return usersHandler(req, res);
    if (third === 'reset-password' && req.method === 'POST') {
      req.params = { ...(req.params || {}), id: second };
      req.query = { ...(req.query || {}), id: second };
      return userResetPasswordHandler(req, res);
    }
    req.params = { ...(req.params || {}), id: second };
    req.query = { ...(req.query || {}), id: second };
    return userIdHandler(req, res);
  }

  // ---- Tools (owner only; hanya dipakai local dev, di-ignore di Vercel) ---
  if (resource === 'tools') {
    if (second === 'backup') return toolsBackupHandler(req, res);
    if (second === 'restore') return toolsRestoreHandler(req, res);
    return toolsHandler(req, res);
  }

  // ---- AI -----------------------------------------------------------------
  // Dipakai frontend untuk AI Autofill (/api/ai/song-search) dan transkripsi
  // chord (/api/ai/chord-transcribe). Tanpa cabang ini keduanya 404.
  if (resource === 'ai') {
    if (second === 'usage') return aiUsageHandler(req, res);
    if (second === 'youtube-search') return aiYoutubeSearchHandler(req, res);
    // api/ai.js memilih handler dari req.url dengan prefix TANPA '/api/ai'
    // (Express memotongnya saat mount). Catch-all meneruskan URL utuh
    // ('/api/ai/song-search'), sehingga tanpa normalisasi ini semua request
    // jatuh ke handler chat → "prompt atau context diperlukan".
    const originalUrl = req.url;
    const aiSubPath = segments.slice(1).join('/');
    const queryIndex = String(originalUrl || '').indexOf('?');
    const aiSearch = queryIndex >= 0 ? String(originalUrl).slice(queryIndex) : '';
    req.url = `/${aiSubPath}${aiSearch}`;
    try {
      return await aiHandler(req, res);
    } finally {
      req.url = originalUrl;
    }
  }

  // ---- Audit logs (owner only; handler memeriksa role) --------------------
  if (resource === 'audit-logs') return auditLogsHandler(req, res);

  // ---- Pengaturan aplikasi global (/api/settings, /api/settings/:key) ------
  // GET: semua user login (daftar tag dipakai parser lirik).
  // PUT/DELETE: hanya owner/admin (diperiksa handler).
  if (resource === 'settings') {
    req.params = { ...(req.params || {}), key: second };
    return settingsHandler(req, res);
  }

  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
}

/**
 * Endpoint publik: login/register/forgot/reset-password tidak boleh dijaga
 * verifyToken — user belum punya token saat mengaksesnya. Dulu catch-all
 * memverifikasi token untuk SEMUA /api/*, sehingga login di Vercel selalu
 * ditolak 401 "No authorization token provided".
 *
 * Kunci rute dibentuk TANPA garis miring pembuka ("POST auth/login"), sama
 * dengan hasil segments.join('/'); versi awal memakai "/auth/login" sehingga
 * tidak pernah cocok dan login tetap diblokir.
 */
const PUBLIC_ROUTES = new Set([
  'POST auth/login',
  'POST auth/register',
  'POST auth/forgot-password',
  'POST auth/reset-password',
]);

function isPublicRoute(method, segments) {
  return PUBLIC_ROUTES.has(`${method} ${segments.slice(0, 2).join('/')}`);
}

export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');

    // Path asli diambil dari header rewrite Vercel. Bila header tidak ada
    // (mis. function dipanggil langsung), pakai req.url apa adanya.
    const { pathname } = resolveUrl(req);
    let segments = routeSegments(pathname);

    // Fallback: sebagian deployment memberi path internal function
    // ("/api/[...path].js") tanpa header. Path rute asli masih bisa dibaca dari
    // req.query.catchAll yang diisi Vercel untuk catch-all function.
    if (segments[0] === '[...path].js' || segments.length === 0) {
      const catchAll = req.query?.catchAll ?? req.query?.path;
      const fromQuery = Array.isArray(catchAll) ? catchAll.join('/') : catchAll;
      if (typeof fromQuery === 'string' && fromQuery && fromQuery !== '[...path].js') {
        segments = fromQuery.split('/').filter(Boolean);
      }
    }

    // Login/register/forgot/reset-password harus bisa diakses TANPA token:
    // itulah saat user belum punya token.
    const publicRoute = isPublicRoute(req.method, segments);
    if (process.env.NODE_ENV !== 'test' && !publicRoute) {
      if (!verifyToken(req, res)) return;
    }

    // Express sudah mem-parse body; di Vercel body bisa OBJECT, STRING JSON,
    // atau masih mentah (stream). Versi lama hanya memeriksa !req.body,
    // sehingga body berupa STRING lolos tanpa di-parse — handler lalu menerima
    // string (bukan objek) dan menjawab 400 "Title required".
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (typeof req.body === 'string') {
        try {
          req.body = req.body.trim() ? JSON.parse(req.body) : {};
        } catch {
          res.status(400).json({ error: 'Body JSON tidak valid' });
          return;
        }
      } else if (Buffer.isBuffer(req.body)) {
        try {
          const text = req.body.toString('utf8').trim();
          req.body = text ? JSON.parse(text) : {};
        } catch {
          res.status(400).json({ error: 'Body JSON tidak valid' });
          return;
        }
      } else if (!req.body) {
        try {
          req.body = await readJson(req);
        } catch {
          res.status(400).json({ error: 'Body JSON tidak valid' });
          return;
        }
      }
    }

    // Rate limiter butuh IP asli dari proxy Vercel.
    const forwardedFor = req.headers?.['x-forwarded-for'];
    if (forwardedFor && !req.ip) req.ip = String(forwardedFor).split(',')[0].trim();

    // Serahkan segmen hasil normalisasi ke dispatch lewat req.__segments agar
    // dispatch tidak perlu menebak ulang path.
    req.__segments = segments;
    await dispatch(req, res);
  } catch (error) {
    console.error('API dispatch error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', message: error?.message });
    }
  }
}
