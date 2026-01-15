/**
 * Batch Song Search API Endpoint
 * Searches for metadata for multiple songs simultaneously
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (req.body && typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      throw new Error(`Invalid JSON: ${e.message}`);
    }
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

// Single song search function (reused from song-search.js)
async function searchSingleSong(title, artist) {
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
  if (process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY) {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      if (!title || !artist) {
        results.debug.geminiBadInput = 'Missing title or artist';
      } else {
        const prompt = `Cari informasi lagu "${title}" oleh "${artist}". Berikan informasi dalam format JSON dengan field:
- key: kunci musik (C, D, E, F, G, A, B atau minor variants seperti Cm, Dm, dll) atau null jika tidak diketahui
- tempo: tempo BPM sebagai angka atau null jika tidak diketahui
- style: genre/style musik (pop, rock, jazz, classical, dll) atau null jika tidak diketahui

Hanya return JSON tanpa penjelasan tambahan. Contoh:
{"key": "G", "tempo": 120, "style": "pop"}`;

        try {
          const response = await model.generateContent(prompt);
          const text = response.response?.text?.();
          
          // Try to parse JSON from response
          if (text) {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.key) results.key = parsed.key;
              if (parsed.tempo) results.tempo = parsed.tempo;
              if (parsed.style) results.style = parsed.style;
            }
          }
        } catch (geminiErr) {
          console.warn(`Gemini API failed for "${title}" by "${artist}":`, geminiErr.message);
          results.debug.geminiError = geminiErr.message;
        }
      }
    } catch (initErr) {
      console.error('Gemini API initialization error:', initErr.message);
    }
  }

  return results;
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
    return res.status(400).json({ error: 'Invalid request body', details: err.message });
  }

  console.log('Batch search request body:', body);
  const { songs } = body; // Array of { title, artist, songId }

  if (!Array.isArray(songs) || songs.length === 0) {
    return res.status(400).json({ 
      error: 'songs array required with at least 1 song',
      received: { songs, type: Array.isArray(songs) ? 'array' : typeof songs, length: songs?.length }
    });
  }

  if (songs.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 songs per batch request' });
  }

  try {
    const results = [];


    // Process songs sequentially with small delay to avoid API rate limits
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const isPending = song.isPending || false;
      
      // For pending songs, artist can be empty - title is required
      if (!song.title) {
        results.push({
          songId: song.songId,
          title: song.title,
          artist: song.artist,
          isPending: isPending,
          error: 'Title required'
        });
        continue;
      }
      
      // For non-pending songs, require both title and artist
      if (!isPending && !song.artist) {
        results.push({
          songId: song.songId,
          title: song.title,
          artist: song.artist,
          isPending: isPending,
          error: 'Artist required for regular songs'
        });
        continue;
      }

      try {
        const searchResult = await searchSingleSong(song.title, song.artist || '');
        results.push({
          songId: song.songId,
          title: song.title,
          artist: song.artist || '',
          isPending: isPending,
          ...searchResult
        });

        // Add delay between requests to avoid API rate limiting (500ms)
        if (i < songs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (err) {
        console.error(`Error searching song ${song.title}:`, err);
        results.push({
          songId: song.songId,
          title: song.title,
          artist: song.artist || '',
          isPending: isPending,
          error: err.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      totalProcessed: results.length,
      results: results
    });
  } catch (error) {
    console.error('Error in batch search:', error);
    return res.status(500).json({
      error: 'Failed to process batch song search',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
