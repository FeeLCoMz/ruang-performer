
/**
 * Ruang Performer API Server
 * Handles songs, setlists, bands, practice sessions, and gigs management
 */

// --- Core/3rd-party imports ---
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import https from 'https';
import http from 'http';

// --- Middleware & utils ---
import { createRateLimiter, userKeyGenerator, RATE_LIMITS } from '../server/middleware-rateLimiter.js';
import { verifyToken } from '../server/_auth.js';

// --- API Handlers ---
// Handler asli tinggal di server/handlers/ (di luar folder api/) karena Vercel
// Hobby menghitung setiap file .js di api/ sebagai satu Serverless Function.
import songsHandler from '../server/handlers/songs.js';
import setlistsHandler from '../server/handlers/setlists.js';
import bandsHandler from '../server/handlers/bands.js';
import bandMembersHandler from '../server/handlers/band-members.js';
import bandIdHandler from '../server/handlers/band-id.js';
import eventsHandler from '../server/handlers/events.js';
import aiHandler from './ai.js';
import aiUsageHandler from '../server/handlers/ai-usage.js';
import catchAllHandler from './[...path].js';
import authRegisterHandler from '../server/handlers/auth-register.js';
import authLoginHandler from '../server/handlers/auth-login.js';
import authMeHandler from '../server/handlers/auth-me.js';
import authForgotHandler from '../server/handlers/auth-forgot-password.js';
import authResetHandler from '../server/handlers/auth-reset-password.js';
import authAuditLogsHandler from '../server/handlers/auth-audit-logs.js';
import authChangePasswordHandler from '../server/handlers/auth-change-password.js';
// Tools handler (export/import)
import toolsHandler from '../server/handlers/tools.js';
import toolsBackupHandler from '../server/handlers/tools-backup.js';
import toolsRestoreHandler from '../server/handlers/tools-restore.js';
import userAuditLogsHandler from '../server/handlers/auth-audit-logs.js';
import authLogoutHandler from '../server/handlers/auth-logout.js';
import auditLogsHandler from '../server/handlers/audit-logs.js';
// Users management handler
import usersHandler from '../server/handlers/users.js';
import userByIdHandler from '../server/handlers/user-id.js';
import userResetPasswordHandler from '../server/handlers/user-reset-password.js';

// --- Env setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// --- Express app setup ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Backup SQL route (must be before /api/tools catch-all)
app.use('/api/tools/backup', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(toolsBackupHandler(req, res)).catch(next);
});

// Restore SQL route
app.use('/api/tools/restore', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(toolsRestoreHandler(req, res)).catch(next);
});

// Tools API (export/import data)
app.use('/api/tools', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(toolsHandler(req, res)).catch(next);
});

// --- JWT Middleware (dipakai route Express di bawah; logikanya di server/_auth.js) ---
function verifyTokenMiddleware(req, res, next) {
  if (process.env.NODE_ENV === 'test') {
    req.user = { userId: 'test-user', email: 'test@example.com', role: 'owner' };
    next();
    return;
  }
  if (!verifyToken(req, res)) return;
  next();
}
export { verifyToken };

// Wrap handler functions so this file can be used for local Express dev
app.post('/api/auth/register', (req, res, next) => {
  Promise.resolve(authRegisterHandler(req, res)).catch(next);
});

app.post('/api/auth/login', (req, res, next) => {
  Promise.resolve(authLoginHandler(req, res)).catch(next);
});


// GET profile
app.get('/api/auth/me', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(authMeHandler(req, res)).catch(next);
});

// UPDATE profile
app.put('/api/auth/me', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(authMeHandler(req, res)).catch(next);
});

// User audit logs
app.get('/api/auth/user-audit-logs', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(userAuditLogsHandler(req, res)).catch(next);
});

// Audit log seluruh user (owner only)
app.get('/api/audit-logs', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(auditLogsHandler(req, res)).catch(next);
});

// AI usage (kuota AI Autofill)
app.get('/api/ai/usage', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(aiUsageHandler(req, res)).catch(next);
});
app.post('/api/auth/change-password', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(authChangePasswordHandler(req, res)).catch(next);
});

// Logout (mencatat audit; JWT tetap stateless)
app.post('/api/auth/logout', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(authLogoutHandler(req, res)).catch(next);
});

app.post('/api/auth/forgot-password', (req, res, next) => {
  Promise.resolve(authForgotHandler(req, res)).catch(next);
});

app.post('/api/auth/reset-password', (req, res, next) => {
  Promise.resolve(authResetHandler(req, res)).catch(next);
});

app.use('/api/songs', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(songsHandler(req, res)).catch(next);
});

app.use('/api/setlists', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(setlistsHandler(req, res)).catch(next);
});

// Band members endpoints (harus sebelum /api/bands agar tidak tertimpa)
app.use('/api/bands/:id/members/:userId?', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(bandMembersHandler(req, res)).catch(next);
});
// Hanya GET/PUT/DELETE oleh-id; POST /api/bands tetap ke handler daftar/band baru.
app.use('/api/bands/:id', verifyTokenMiddleware, (req, res, next) => {
  if (req.method === 'POST') return next();
  Promise.resolve(bandIdHandler(req, res)).catch(next);
});
app.use('/api/bands', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(bandsHandler(req, res)).catch(next);
});

// ...invitation endpoints removed...


// Practice and gigs endpoints now handled by their own handlers
app.use('/api/events/:type/:id?', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(eventsHandler(req, res)).catch(next);
});

// Fallback utama (dev): satu handler untuk seluruh /api/*, sama seperti di
// Vercel (api/[...path].js). Route khusus di atas tetap menang karena
// didaftarkan lebih dulu.
app.use('/api', (req, res, next) => {
  Promise.resolve(catchAllHandler(req, res)).catch(next);
});

// Users management endpoints (owner only)
app.post('/api/users/:id/reset-password', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(userResetPasswordHandler(req, res)).catch(next);
});
app.get('/api/users/:id', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(userByIdHandler(req, res)).catch(next);
});
app.put('/api/users/:id', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(userByIdHandler(req, res)).catch(next);
});
app.patch('/api/users/:id', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(userByIdHandler(req, res)).catch(next);
});
app.delete('/api/users/:id', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(userByIdHandler(req, res)).catch(next);
});
app.get('/api/users', verifyTokenMiddleware, (req, res, next) => {
  Promise.resolve(usersHandler(req, res)).catch(next);
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/ai', (req, res, next) => {
  Promise.resolve(aiHandler(req, res)).catch(next);
});

// Extract chord from URL (CORS bypass)
app.post('/api/extract-chord', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL diperlukan' });
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // Validate URL
    let urlObj;
    try {
      urlObj = new URL(normalizedUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Format URL tidak valid' });
    }


    // Use https or http module based on protocol
    const client = urlObj.protocol === 'https:' ? https : http;

    // Fetch the page content with timeout
    const fetchPromise = new Promise((resolve, reject) => {
      const request = client.get(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Halaman tidak ditemukan (${response.statusCode})`));
          return;
        }

        let html = '';
        response.on('data', (chunk) => {
          html += chunk;
        });

        response.on('end', () => {
          if (!html || html.length === 0) {
            reject(new Error('Halaman kosong atau tidak valid'));
          } else {
            resolve(html);
          }
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Timeout: Halaman terlalu lama merespons'));
      });
    });

    const html = await fetchPromise;
    res.json({ html });

  } catch (error) {
    console.error('Extract chord error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Gagal memproses URL' 
    });
  }
});

app.get('/', (req, res) => {
  res.send('Ruang Performer API is running');
});

// Only listen when this file is executed directly, not when imported by tests
const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (process.env.NODE_ENV !== 'production' && isMain) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Ruang Performer API running on port ${PORT}`);
  });
}

export default app;
