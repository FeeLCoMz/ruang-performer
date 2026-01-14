/**
 * Song AI Search API Endpoint
 * Searches for song metadata using various sources
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error(`Invalid JSON: ${e.message}`));
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = {};
  try {
    body = await parseBody(req);
  } catch (err) {
    console.error('Body parsing error:', err);
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { title, artist } = body;

  if (!title || !artist) {
    return res.status(400).json({ error: 'Title and artist required' });
  }

  try {
    const results = {
      key: null,
      tempo: null,
      style: null,
      youtubeId: null,
      chordLinks: [],
      debug: {}
    };

    // Check if YouTube API key is configured
    if (!process.env.VITE_YOUTUBE_API_KEY) {
      console.warn('Warning: VITE_YOUTUBE_API_KEY not configured');
      results.debug.youtubeKeyMissing = true;
    }

    // Search YouTube for video
    if (process.env.VITE_YOUTUBE_API_KEY) {
      try {
        const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(`${title} ${artist}`)}&key=${process.env.VITE_YOUTUBE_API_KEY}`;
        const youtubeResponse = await fetch(youtubeUrl, {
          timeout: 5000
        });

        if (youtubeResponse.ok) {
          const data = await youtubeResponse.json();
          if (data?.items?.length > 0) {
            results.youtubeId = data.items[0].id.videoId;
          }
        } else {
          results.debug.youtubeStatus = youtubeResponse.status;
          console.error(`YouTube API returned ${youtubeResponse.status}`);
        }
      } catch (err) {
        console.error('YouTube search error:', err);
        results.debug.youtubeError = err.message;
      }
    }

    // Add chord search links
    results.chordLinks = [
      {
        title: 'Chordtela',
        site: 'chordtela.com',
        url: `https://www.chordtela.com/chord-kunci-gitar-dasar-hasil-pencarian?q=${encodeURIComponent(`${title} ${artist}`)}`
      },
      {
        title: 'Ultimate Guitar',
        site: 'ultimate-guitar.com',
        url: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(`${title} ${artist}`)}`
      },
      {
        title: 'Chordify',
        site: 'chordify.net',
        url: `https://www.chordify.net/search?q=${encodeURIComponent(`${title} ${artist}`)}`
      }
    ];

    // Try to get song info from Gemini API for key, tempo, style
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `Cari informasi lagu "${title}" oleh "${artist}". Berikan informasi dalam format JSON dengan field:
- key: kunci musik (C, D, E, F, G, A, B atau minor variants seperti Cm, Dm, dll) atau null jika tidak diketahui
- tempo: tempo BPM sebagai angka atau null jika tidak diketahui
- style: genre/style musik (pop, rock, jazz, classical, dll) atau null jika tidak diketahui

Hanya return JSON tanpa penjelasan tambahan. Contoh:
{"key": "G", "tempo": 120, "style": "pop"}`;

        const response = await model.generateContent(prompt);
        const text = response.response.text();
        
        // Try to parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.key) results.key = parsed.key;
          if (parsed.tempo) results.tempo = parsed.tempo;
          if (parsed.style) results.style = parsed.style;
        }
      } catch (err) {
        console.error('Gemini API error:', err);
        results.debug.geminiError = err.message;
      }
    }

    // Always return results with 200 status
    // even if no data found - let frontend handle it
    return res.status(200).json(results);
  } catch (error) {
    console.error('Error in song search:', error);
    return res.status(500).json({
      error: 'Failed to search song information',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
