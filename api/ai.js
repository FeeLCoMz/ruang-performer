
import 'dotenv/config';
import busboy from 'busboy';

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  const url = req.url || '';
  if (url.startsWith('/song-search')) return await handleSongSearch(req, res);
  if (url.startsWith('/batch-search')) return await handleBatchSearch(req, res);
  if (url.startsWith('/transcribe')) return await handleTranscribe(req, res);
  return await handleChat(req, res);
}

// --- Chat/general AI handler ---
async function handleChat(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY tidak diset' });
    }
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const body = await readJson(req);
    const prompt = (body?.prompt || '').toString();
    const context = (body?.context || '').toString();
    const system = (body?.system || '').toString();
    const model = (body?.model || 'gemini-2.5-flash').toString();
    if (!prompt.trim() && !context.trim()) {
      return res.status(400).json({ error: 'prompt atau context diperlukan' });
    }
    const contents = [];
    if (system) contents.push({ role: 'user', parts: [{ text: `System: ${system}` }] });
    if (context) contents.push({ role: 'user', parts: [{ text: `Context:\n${context}` }] });
    contents.push({ role: 'user', parts: [{ text: prompt.trim() }] });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('Gemini API error:', data);
      return res.status(resp.status).json({ error: data.error?.message || 'Gemini API gagal' });
    }
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '';
    return res.status(200).json({ text });
  } catch (err) {
    console.error('API /api/ai error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

// --- Song search handler ---
async function handleSongSearch(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let body = {};
  try {
    body = await readJson(req);
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
      instrument: null,
      youtubeId: null,
      chordLinks: [],
      debug: {}
    };
    // YouTube search
    if (!process.env.VITE_YOUTUBE_API_KEY) {
      console.warn('Warning: VITE_YOUTUBE_API_KEY not configured');
      results.debug.youtubeKeyMissing = true;
    }
    if (process.env.VITE_YOUTUBE_API_KEY) {
      try {
        const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(`${title} ${artist}`)}&key=${process.env.VITE_YOUTUBE_API_KEY}`;
        const youtubeResponse = await fetch(youtubeUrl, { timeout: 5000 });
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
    // Chord links
    results.chordLinks = [
      { title: 'Chordtela', site: 'chordtela.com', url: `https://www.chordtela.com/chord-kunci-gitar-dasar-hasil-pencarian?q=${encodeURIComponent(`${title} ${artist}`)}` },
      { title: 'Ultimate Guitar', site: 'ultimate-guitar.com', url: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(`${title} ${artist}`)}` },
      { title: 'Chordify', site: 'chordify.net', url: `https://www.chordify.net/search?q=${encodeURIComponent(`${title} ${artist}`)}` }
    ];
    // Gemini song info
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const model = genAI.getGenerativeModel({ model: geminiModel });
        const prompt = `Cari informasi lagu \"${title}\" oleh \"${artist}\". Berikan informasi dalam format JSON dengan field:\n- key: kunci musik (C, D, E, F, G, A, B atau minor variants seperti Cm, Dm, dll) atau null jika tidak diketahui\n- tempo: tempo BPM sebagai angka atau null jika tidak diketahui\n- style: genre/style musik (pop, rock, jazz, classical, dll) atau null jika tidak diketahui\n- instrument: instrumen utama yang digunakan (misal: gitar, piano, drum, biola, dll) atau null jika tidak diketahui\n\nHanya return JSON tanpa penjelasan tambahan. Contoh:\n{"key": "G", "tempo": 120, "style": "pop", "instrument": "gitar"}`;
        const response = await model.generateContent(prompt);
        const text = response.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.key) results.key = parsed.key;
          if (parsed.tempo) results.tempo = parsed.tempo;
          if (parsed.style) results.style = parsed.style;
          if (parsed.instrument) results.instrument = parsed.instrument;
        }
      } catch (err) {
        console.error('Gemini API error:', err);
        results.debug.geminiError = err.message;
        results.debug.geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      }
    }
    return res.status(200).json(results);
  } catch (error) {
    console.error('Error in song search:', error);
    return res.status(500).json({ error: 'Failed to search song information', message: error.message, details: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
}

// --- Batch search handler ---
async function handleBatchSearch(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let body = {};
  try {
    body = await readJson(req);
  } catch (err) {
    console.error('Body parsing error:', err);
    return res.status(400).json({ error: 'Invalid request body', details: err.message });
  }
  const { songs } = body;
  if (!Array.isArray(songs) || songs.length === 0) {
    return res.status(400).json({ error: 'songs array required with at least 1 song', received: { songs, type: Array.isArray(songs) ? 'array' : typeof songs, length: songs?.length } });
  }
  if (songs.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 songs per batch request' });
  }
  try {
    const results = [];
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const isPending = song.isPending || false;
      if (!song.title) {
        results.push({ songId: song.songId, title: song.title, artist: song.artist, isPending: isPending, error: 'Title required' });
        continue;
      }
      if (!isPending && !song.artist) {
        results.push({ songId: song.songId, title: song.title, artist: song.artist, isPending: isPending, error: 'Artist required for regular songs' });
        continue;
      }
      try {
        // Reuse single song search logic
        const searchResult = await handleSongSearch({ method: 'POST', body: song }, { status: () => ({ json: (v) => v }) });
        results.push({ songId: song.songId, title: song.title, artist: song.artist || '', isPending: isPending, ...searchResult });
        if (i < songs.length - 1) await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Error searching song ${song.title}:`, err);
        results.push({ songId: song.songId, title: song.title, artist: song.artist || '', isPending: isPending, error: err.message });
      }
    }
    return res.status(200).json({ success: true, totalProcessed: results.length, results: results });
  } catch (error) {
    console.error('Error in batch search:', error);
    return res.status(500).json({ error: 'Failed to process batch song search', message: error.message, details: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
}

// --- Transcribe handler ---
async function handleTranscribe(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const bb = busboy({ headers: req.headers });
    let audioBuffer = null;
    let mimeType = 'audio/mpeg';
    let fileName = '';
    await new Promise((resolve, reject) => {
      bb.on('file', (fieldname, file, info) => {
        if (fieldname === 'audio') {
          mimeType = info.mimeType || 'audio/mpeg';
          fileName = info.filename || 'audio.mp3';
          const chunks = [];
          file.on('data', (chunk) => { chunks.push(chunk); });
          file.on('end', () => { audioBuffer = Buffer.concat(chunks); });
          file.on('error', reject);
        }
      });
      bb.on('close', resolve);
      bb.on('error', reject);
      req.pipe(bb);
    });
    if (!audioBuffer || audioBuffer.length === 0) {
      res.status(400).json({ error: 'Audio file required or empty' });
      return;
    }
    const base64Audio = audioBuffer.toString('base64');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const response = await model.generateContent([
      { inlineData: { mimeType: mimeType, data: base64Audio } },
      { text: 'Transkripsi audio ini menjadi teks lirik lagu. Jika ada bagian yang tidak jelas, gunakan [?]. Format hasil sebagai lirik lagu yang bisa dibaca. Jangan tambahkan keterangan atau penjelasan lain, hanya liriknya saja.' },
    ]);
    const transcript = response.response.text();
    res.status(200).json({ success: true, transcript: transcript || '', message: 'Transkripsi berhasil' });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message || 'Gagal transkripsi audio', details: error.toString() });
  }
}
