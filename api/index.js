
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
import { createRateLimiter, userKeyGenerator, RATE_LIMITS } from './middleware/rateLimiter.js';

// --- API Handlers ---
import songsHandler from './songs/index.js';
import setlistsHandler from './setlists/index.js';
import bandsHandler from './bands/index.js';
import bandMembersHandler from './bands/members.js';
import aiHandler from './ai.js';
import authRegisterHandler from './auth/register.js';
import authLoginHandler from './auth/login.js';
import authMeHandler from './auth/me.js';
import authForgotHandler from './auth/forgot-password.js';
import authResetHandler from './auth/reset-password.js';
import auth2FASetupHandler from './auth/2fa-setup.js';
import auth2FAVerifyHandler from './auth/2fa-verify.js';
// Tools handler (export/import)
import toolsHandler from './tools/index.js';
import toolsBackupHandler from './tools/backup.js';
import toolsRestoreHandler from './tools/restore.js';
import userAuditLogsHandler from './auth/user-audit-logs.js';
// Users management handler
import usersHandler from './users/index.js';
import userByIdHandler from './users/[id].js';
import userResetPasswordHandler from './users/reset-password.js';

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
app.use('/api/tools/backup', verifyToken, (req, res, next) => {
  Promise.resolve(toolsBackupHandler(req, res)).catch(next);
});

// Restore SQL route
app.use('/api/tools/restore', verifyToken, (req, res, next) => {
  Promise.resolve(toolsRestoreHandler(req, res)).catch(next);
});

// Tools API (export/import data)
app.use('/api/tools', verifyToken, (req, res, next) => {
  Promise.resolve(toolsHandler(req, res)).catch(next);
});

// --- JWT Middleware ---
export function verifyToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Wrap handler functions so this file can be used for local Express dev
app.post('/api/auth/register', 
  createRateLimiter({ 
    maxRequests: RATE_LIMITS.AUTH_REGISTER.maxRequests,
    windowMs: RATE_LIMITS.AUTH_REGISTER.windowMs
  }),
  (req, res, next) => {
    Promise.resolve(authRegisterHandler(req, res)).catch(next);
  }
);

app.post('/api/auth/login', 
  createRateLimiter({ 
    maxRequests: RATE_LIMITS.AUTH_LOGIN.maxRequests,
    windowMs: RATE_LIMITS.AUTH_LOGIN.windowMs
  }),
  (req, res, next) => {
    Promise.resolve(authLoginHandler(req, res)).catch(next);
  }
);


// GET profile
app.get('/api/auth/me', verifyToken, (req, res, next) => {
  Promise.resolve(authMeHandler(req, res)).catch(next);
});

// UPDATE profile
app.put('/api/auth/me', verifyToken, (req, res, next) => {
  Promise.resolve(authMeHandler(req, res)).catch(next);
});

// User audit logs
app.get('/api/auth/user-audit-logs', verifyToken, (req, res, next) => {
  Promise.resolve(userAuditLogsHandler(req, res)).catch(next);
});

// Change password
import changePasswordHandler from './auth/change-password.js';
app.post('/api/auth/change-password', verifyToken, (req, res, next) => {
  Promise.resolve(changePasswordHandler(req, res)).catch(next);
});

app.post('/api/auth/forgot-password',
  createRateLimiter({ 
    maxRequests: RATE_LIMITS.AUTH_FORGOT.maxRequests,
    windowMs: RATE_LIMITS.AUTH_FORGOT.windowMs
  }),
  (req, res, next) => {
    Promise.resolve(authForgotHandler(req, res)).catch(next);
  }
);

app.post('/api/auth/reset-password',
  createRateLimiter({ 
    maxRequests: RATE_LIMITS.AUTH_RESET.maxRequests,
    windowMs: RATE_LIMITS.AUTH_RESET.windowMs
  }),
  (req, res, next) => {
    Promise.resolve(authResetHandler(req, res)).catch(next);
  }
);

app.get('/api/auth/2fa/setup', 
  verifyToken,
  createRateLimiter({ 
    maxRequests: RATE_LIMITS.AUTH_2FA.maxRequests,
    windowMs: RATE_LIMITS.AUTH_2FA.windowMs,
    keyGenerator: userKeyGenerator
  }),
  (req, res, next) => {
    Promise.resolve(auth2FASetupHandler(req, res)).catch(next);
  }
);

app.post('/api/auth/2fa/verify',
  verifyToken,
  createRateLimiter({ 
    maxRequests: RATE_LIMITS.AUTH_2FA.maxRequests,
    windowMs: RATE_LIMITS.AUTH_2FA.windowMs,
    keyGenerator: userKeyGenerator
  }),
  (req, res, next) => {
    Promise.resolve(auth2FAVerifyHandler(req, res)).catch(next);
  }
);

app.use('/api/songs', verifyToken, (req, res, next) => {
  Promise.resolve(songsHandler(req, res)).catch(next);
});

app.use('/api/setlists', verifyToken, (req, res, next) => {
  Promise.resolve(setlistsHandler(req, res)).catch(next);
});

// Band members endpoints (harus sebelum /api/bands agar tidak tertimpa)
app.use('/api/bands/:id/members/:userId?', verifyToken, (req, res, next) => {
  Promise.resolve(bandMembersHandler(req, res)).catch(next);
});
app.use('/api/bands', verifyToken, (req, res, next) => {
  Promise.resolve(bandsHandler(req, res)).catch(next);
});

// ...invitation endpoints removed...


// Practice and gigs endpoints now handled by their own handlers
import eventsHandler from './events/index.js';
app.use('/api/events/:type/:id?', verifyToken, (req, res, next) => {
  Promise.resolve(eventsHandler(req, res)).catch(next);
});

// Users management endpoints (owner only)
app.post('/api/users/:id/reset-password', verifyToken, (req, res, next) => {
  Promise.resolve(userResetPasswordHandler(req, res)).catch(next);
});
app.get('/api/users/:id', verifyToken, (req, res, next) => {
  Promise.resolve(userByIdHandler(req, res)).catch(next);
});
app.put('/api/users/:id', verifyToken, (req, res, next) => {
  Promise.resolve(userByIdHandler(req, res)).catch(next);
});
app.delete('/api/users/:id', verifyToken, (req, res, next) => {
  Promise.resolve(userByIdHandler(req, res)).catch(next);
});
app.get('/api/users', verifyToken, (req, res, next) => {
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
