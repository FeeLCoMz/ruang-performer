import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import https from 'https';
import http from 'http';
import { load as cheerioLoad } from 'cheerio';
import songsHandler from './songs/index.js';
import songsIdHandler from './songs/[id].js';
import songsSyncHandler from './songs/sync.js';
import setlistsHandler from './setlists/index.js';
import setlistsIdHandler from './setlists/[id].js';
import statusHandler from './status.js';
import aiHandler from './ai/index.js';

const app = express();
app.use(cors());

// Exclude /api/ai from JSON parser since it handles multipart form data
app.use((req, res, next) => {
  if (req.path.startsWith('/api/ai')) {
    next();
  } else {
    express.json({ limit: '100mb' })(req, res, next);
  }
});

// Wrap handler functions so this file can be used for local Express dev
app.use('/api/songs/sync', (req, res, next) => {
  Promise.resolve(songsSyncHandler(req, res)).catch(next);
});
app.use('/api/songs/:id', (req, res, next) => {
  Promise.resolve(songsIdHandler(req, res)).catch(next);
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

// Scrape chord and lyrics from URL
app.post('/api/scrap-chord', async (req, res) => {
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
      return res.status(400).json({ error: 'Format URL tidak valid. Contoh: https://ultimate-guitar.com/...' });
    }

    console.log('Scraping URL:', normalizedUrl);

    // Fetch using Node.js native http/https with proper error handling
    const html = await new Promise((resolve, reject) => {
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const makeRequest = (url, redirectCount = 0) => {
        if (redirectCount > 5) {
          reject(new Error('Terlalu banyak redirect'));
          return;
        }

        const urlObj = new URL(url);
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': `${urlObj.protocol}//${urlObj.hostname}/`,
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'DNT': '1',
            'Connection': 'keep-alive'
          },
          timeout: 15000
        };

        const req = client.request(options, (res) => {
          // Handle redirects
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = res.headers.location.startsWith('http')
              ? res.headers.location
              : urlObj.origin + res.headers.location;
            makeRequest(redirectUrl, redirectCount + 1);
            return;
          }

          if (res.statusCode !== 200) {
            let errorMsg = `HTTP ${res.statusCode}: ${http.STATUS_CODES[res.statusCode] || 'Error'}.`;
            if (res.statusCode === 403) {
              errorMsg += ' Situs ini memblokir scraping otomatis. Gunakan fallback manual (copy-paste) atau coba situs lain yang lebih terbuka.';
            } else if (res.statusCode === 404) {
              errorMsg += ' URL tidak ditemukan. Cek kembali link-nya.';
            } else {
              errorMsg += ' Cek URL atau coba situs lain.';
            }
            reject(new Error(errorMsg));
            return;
          }

          let data = '';
          res.on('data', chunk => {
            data += chunk;
          });

          res.on('end', () => {
            if (!data || data.length < 50) {
              reject(new Error('Response terlalu kecil - halaman kosong atau tidak valid'));
            } else {
              resolve(data);
            }
          });
        });

        req.on('error', (err) => {
          reject(new Error(`Koneksi gagal: ${err.message}`));
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout: Situs memerlukan waktu terlalu lama. Coba lagi atau gunakan fallback manual.'));
        });

        req.end();
      };
      makeRequest(normalizedUrl);
    });

    // Parse HTML dengan Cheerio
    const $ = cheerioLoad(html);
    
    // Strategy 1: Try to find pre/code blocks yang biasa digunakan untuk chord/lyrics
    let chordLyricsContent = '';
    
    // Look for common chord/lyrics containers
    const commonSelectors = [
      'pre', // Pre-formatted text
      'code',
      '[class*="chord"]',
      '[class*="lyric"]',
      '[class*="tab"]',
      '[id*="chord"]',
      '[id*="lyric"]',
      '[id*="tab"]',
      '.content',
      '.main',
      'article',
      'main'
    ];
    
    for (const selector of commonSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        for (const elem of elements) {
          const text = $(elem).text();
          if (text && text.length > 100) { // At least 100 chars
            // Check if contains chord patterns
            if (text.match(/(\[([A-G][#b]?[a-z\d/]*)\]|Verse|Chorus|Bridge|Intro|Outro)/i)) {
              chordLyricsContent += text + '\n';
            }
          }
        }
      }
      if (chordLyricsContent.length > 200) break;
    }
    
    // Strategy 2: If nothing found in containers, get all text and filter
    if (!chordLyricsContent || chordLyricsContent.length < 100) {
      // Remove script, style, nav, footer
      $('script, style, nav, footer, noscript, iframe, svg').remove();
      chordLyricsContent = $('body').text();
    }
    
    // Clean up text
    let textContent = chordLyricsContent
      .replace(/\s+/g, '\n') // Split by whitespace
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
    
    // Try to extract chord and lyrics section
    const lines = textContent.split('\n');
    
    let chordLyricsSection = [];
    let inChordSection = false;
    let sectionCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Check for section headers
      const isSectionHeader = line.match(/^(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Pre-Hook|Interlude|Break|Solo|Coda|Refrain|Hook|Instrumental)[\s:]*(\d+)?(?:\s|$)/i);
      
      // Check for chord patterns
      const hasChords = line.match(/(\[([A-G][#b]?[a-z\d/]*)\]|\b([A-G][#b]?(?:m|add|sus|dim|aug|maj|min)?\d*(?:\/[A-G][#b]?)?)\s*[\|\.]|\b[A-G][#b]?(?:m|add|sus|dim|aug|maj|min)?\d*(?:\/[A-G][#b]?)?\b)/);
      
      if (isSectionHeader) {
        sectionCount++;
        inChordSection = true;
        chordLyricsSection.push(line);
      } else if (hasChords && !inChordSection && sectionCount === 0) {
        inChordSection = true;
        chordLyricsSection.push(line);
      } else if (inChordSection) {
        if (line.length < 200 || hasChords) {
          chordLyricsSection.push(line);
        } else if (line.length > 200 && !hasChords && sectionCount > 0) {
          break;
        }
      }
    }
    
    // Fallback: if nothing found with section detection, get any lines with chords
    if (chordLyricsSection.length < 5) {
      chordLyricsSection = lines
        .filter(line => line.match(/(\[([A-G][#b]?[a-z\d/]*)\]|\b([A-G][#b]?(?:m|add|sus|dim|aug|maj|min)?\d*)\b|Verse|Chorus|Bridge|Intro|Outro|Pre-|Hook)/i))
        .slice(0, 200);
    }
    
    // Last resort: get first meaningful content
    if (chordLyricsSection.length < 3) {
      const contentStart = lines.findIndex(l => l.match(/[a-zA-Z]{3,}/));
      if (contentStart >= 0) {
        chordLyricsSection = lines.slice(contentStart, contentStart + 100);
      }
    }
    
    const lyrics = chordLyricsSection.join('\n').trim();
    
    // Extract lyrics-only version
    const lyricsOnly = chordLyricsSection
      .map(line => {
        return line
          .replace(/\[([A-G][#b]?[a-z\d/]*)\]/g, '') // Remove [C] format
          .replace(/\b([A-G][#b]?(?:m|add|sus|dim|aug|maj|min)?\d*(?:\/[A-G][#b]?)?)\s*[\|\.](?=\s|$)/g, '') // Remove chord | patterns
          .replace(/^\s*[\|\.]+\s*/g, '') // Remove leading bars
          .replace(/\s+[\|\.]+\s*$/g, '') // Remove trailing bars
          .replace(/\s+/g, ' ')
          .trim();
      })
      .filter(line => line.length > 0)
      .join('\n')
      .trim();
    
    if (!lyrics || lyrics.length < 20) {
      return res.status(400).json({ 
        error: 'Tidak dapat menemukan chord/lirik di halaman ini. Tips: Pastikan URL menunjuk langsung ke halaman lirik (bukan home page). Contoh URL yang benar: https://ultimate-guitar.com/tab/..., https://chordtela.com/...' 
      });
    }

    res.json({ 
      lyrics: lyrics || '',
      lyrics_only: lyricsOnly || ''
    });

  } catch (error) {
    console.error('Scrap chord error:', error.message);
    
    // Provide helpful error message based on error type
    let userMessage = '';
    if (error.message.includes('HTTP 404')) {
      userMessage = 'Halaman tidak ditemukan (404). Cek URL atau coba situs lain.';
    } else if (error.message.includes('HTTP 403')) {
      userMessage = 'Akses ditolak oleh situs (403). Gunakan copy-paste manual dari website.';
    } else if (error.message.includes('Koneksi gagal') || error.message.includes('ECONNREFUSED')) {
      userMessage = 'Tidak dapat terhubung ke situs. Cek internet atau coba URL lain.';
    } else if (error.message.includes('Timeout')) {
      userMessage = 'Timeout. Situs terlalu lambat. Coba lagi dalam beberapa saat.';
    } else if (error.message.includes('Response terlalu kecil')) {
      userMessage = 'Halaman kosong atau tidak dapat diakses. Cek URL.';
    } else if (error.message.includes('Terlalu banyak redirect')) {
      userMessage = 'URL melakukan terlalu banyak redirect. Coba URL lain.';
    } else {
      userMessage = 'Gagal memproses halaman. Gunakan copy-paste manual dari website.';
    }
    
    res.status(500).json({ 
      error: userMessage,
      suggestion: 'Alternatif: Buka website di browser, copy-paste lirik & chord secara manual ke form.'
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
