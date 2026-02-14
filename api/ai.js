
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
  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }
  try {
    const results = {
      artist: null,
      key: null,
      tempo: null,
      genre: null,
      capo: null,
      arrangementStyle: null, // new field
      keyboardPatch: null,    // new field
      youtubeId: null,
      lyrics: null,
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
        let prompt;
        if (!artist) {
          prompt = `Cari informasi lagu berjudul \"${title}\". Jika diketahui, berikan juga nama artis/penyanyi. Berikan informasi dalam format JSON dengan field:\n- artist: nama artis/penyanyi\n- key: kunci musik (C, D, E, F, G, A, B atau minor variants seperti Cm, Dm, dll) atau null jika tidak diketahui\n- tempo: tempo BPM sebagai angka atau null jika tidak diketahui\n- genre: genre/style musik (pop, rock, jazz, classical, dll) atau null jika tidak diketahui\n- capo: posisi capo (angka 0-12) atau null jika tidak ada/tidak diketahui\n- arrangement_style: gaya aransemen (akustik, full band, unplugged, dll)\n- keyboard_patch: string penjelasan patch keyboard yang digunakan dan bagaimana patch tersebut dipakai dalam lagu (misal: \"EP1 untuk intro dan verse, Pad untuk chorus, Strings untuk bridge\") atau null jika tidak diketahui\n- lyrics: lirik lagu lengkap (string, jika ada, tanpa penjelasan tambahan)\n\nHanya return JSON tanpa penjelasan tambahan. Contoh:\n{"artist": "John Doe", "key": "G", "tempo": 120, "genre": "pop", "capo": 2, "arrangement_style": "full band", "keyboard_patch": "EP1 untuk intro, Pad untuk chorus", "lyrics": "Ini lirik lagu..."}`;
        } else {
          prompt = `Cari informasi lagu \"${title}\" oleh \"${artist}\". Berikan informasi dalam format JSON dengan field:\n- artist: nama artis/penyanyi\n- key: kunci musik (C, D, E, F, G, A, B atau minor variants seperti Cm, Dm, dll) atau null jika tidak diketahui\n- tempo: tempo BPM sebagai angka atau null jika tidak diketahui\n- genre: genre/style musik (pop, rock, jazz, classical, dll) atau null jika tidak diketahui\n- capo: posisi capo (angka 0-12) atau null jika tidak ada/tidak diketahui\n- arrangement_style: gaya aransemen (akustik, full band, unplugged, dll)\n- keyboard_patch: string penjelasan patch keyboard yang digunakan dan bagaimana patch tersebut dipakai dalam lagu (misal: \"EP1 untuk intro dan verse, Pad untuk chorus, Strings untuk bridge\") atau null jika tidak diketahui\n- lyrics: lirik lagu lengkap (string, jika ada, tanpa penjelasan tambahan)\n\nHanya return JSON tanpa penjelasan tambahan. Contoh:\n{"artist": "${artist}", "key": "G", "tempo": 120, "genre": "pop", "capo": 2, "arrangement_style": "akustik", "keyboard_patch": "EP1 untuk intro, Pad untuk chorus", "lyrics": "Ini lirik lagu..."}`;
        }
        const response = await model.generateContent(prompt);
        const text = response.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.artist) results.artist = parsed.artist;
          if (parsed.key) results.key = parsed.key;
          if (parsed.tempo) results.tempo = parsed.tempo;
          if (parsed.genre) results.genre = parsed.genre;
          if (parsed.capo !== undefined && parsed.capo !== null) results.capo = parsed.capo;
          if (parsed.arrangement_style) results.arrangementStyle = parsed.arrangement_style;
          if (parsed.keyboard_patch) results.keyboardPatch = parsed.keyboard_patch;
          if (parsed.lyrics) results.lyrics = parsed.lyrics;
        }
      } catch (err) {
        console.error('Gemini API error:', err);
        results.debug.geminiError = err.message;
        results.debug.geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      }
    }
    // Always return artist (from input or AI)
    if (!results.artist) results.artist = artist || null;
    // Always return chordLinks
    results.chordLinks = results.chordLinks || [
      { title: 'Chordtela', site: 'chordtela.com', url: `https://www.chordtela.com/chord-kunci-gitar-dasar-hasil-pencarian?q=${encodeURIComponent(`${title} ${artist || results.artist || ''}`)}` },
      { title: 'Ultimate Guitar', site: 'ultimate-guitar.com', url: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(`${title} ${artist || results.artist || ''}`)}` },
      { title: 'Chordify', site: 'chordify.net', url: `https://www.chordify.net/search?q=${encodeURIComponent(`${title} ${artist || results.artist || ''}`)}` },
      { title: 'Google Lirik', site: 'google.com', url: `https://www.google.com/search?q=${encodeURIComponent(`${title} ${artist || results.artist || ''} lirik`)}` }
    ];
    return res.status(200).json(results);
  } catch (error) {
    console.error('Error in song search:', error);
    return res.status(500).json({ error: 'Failed to search song information', message: error.message, details: process.env.NODE_ENV === 'development' ? error.stack : undefined });
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
