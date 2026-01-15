// ...existing code...
// Single import block
import './env.js';
// ...existing code...

// Baru import router dan lain-lain
import express from 'express';
import cors from 'cors';
import authRouter from './auth.js';
import https from 'https';
import http from 'http';
import songsHandler from './songs.js';
import setlistsHandler from './setlists/index.js';
import setlistsIdHandler from './setlists/[id].js';
import statusHandler from './status.js';
import aiHandler from './ai/index.js';

const app = express();
app.use(cors());

// Mount auth endpoints
app.use('/api/auth', authRouter);

// Exclude /api/ai from JSON parser since it handles multipart form data
app.use((req, res, next) => {
  if (req.path.startsWith('/api/ai')) {
    next();
  } else {
    express.json({ limit: '100mb' })(req, res, next);
  }
});
app.use('/api/songs', (req, res, next) => {
  Promise.resolve(songsHandler(req, res)).catch(next);
});
app.use('/api/setlists/:id', (req, res, next) => {
  Promise.resolve(setlistsIdHandler(req, res)).catch(next);
});
app.use('/api/setlists', (req, res, next) => {
  Promise.resolve(setlistsHandler(req, res)).catch(next);
});
app.use('/api/status', (req, res, next) => {
  Promise.resolve(statusHandler(req, res)).catch(next);
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

    console.log('Fetching URL:', normalizedUrl);

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
  res.send('Turso ChordPro API is running');
});

// Only listen in local dev
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}



export default app;
