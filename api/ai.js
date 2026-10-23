// Gemini models that support generateContent for song metadata lookup AND
// inline audio input (transcriber). Exclude TTS/image/video/live models.
// NOTE: Gemma variants are not consistently available in the v1beta generateContent
// API for all projects, so we intentionally exclude them to prevent 404s on
// production traffic.
//
// Urutan penting — dipakai sebagai rantai fallback:
//   - model baru lebih dulu (3.x) karena 2.5-* sudah ditolak untuk API key baru,
//   - alias "-latest" diletakkan di akhir karena bisa menggantung lama (timeout),
//   - "hint" untuk audio hanya memakai model yang cepat & paham audio;
//   - transcribe-live memakai bidiGenerateContent, jadi tidak pernah masuk sini.
export const GEMINI_TEXT_MODELS_SUPPORTED = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-pro-latest',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite',
];

const UNSUPPORTED_GEMINI_MODELS = new Set([
  'gemma-3n-e2b-it',
  'gemma-3n-e4b-it',
]);

const GEMINI_FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
];

/** Batas satu percobaan model untuk audio: cukup untuk klip 18 MB, jauh di bawah timeout klien. */
const GEMINI_AUDIO_REQUEST_TIMEOUT_MS = 45000;

/** Default model untuk endpoint audio (transcriber): harus cepat & multimodal. */
export const DEFAULT_GEMINI_AUDIO_MODEL = 'gemini-3.6-flash';

function isGeminiProjectDeniedAccess(status, message) {
  if (status !== 403) return false;
  const normalized = (message || '').toString().toLowerCase();
  return normalized.includes('denied access') || normalized.includes('project has been denied access');
}

export function buildGeminiModelCandidates(requestedModel) {
  const unique = [];
  const seen = new Set();
  for (const modelName of [requestedModel, ...GEMINI_FALLBACK_MODELS, ...GEMINI_TEXT_MODELS_SUPPORTED]) {
    if (!modelName || seen.has(modelName) || UNSUPPORTED_GEMINI_MODELS.has(modelName)) continue;
    seen.add(modelName);
    unique.push(modelName);
  }
  return unique;
}
// Cache in-memory untuk info lagu (title+artist).
//
// Sebelumnya berupa objek biasa yang tumbuh tanpa batas: setiap judul unik
// menambah entri permanen selama server hidup (kebocoran memori bertahap) dan
// data basi tidak pernah kedaluwarsa. Kini dibatasi jumlah entri + TTL.
const SONG_CACHE_MAX_ENTRIES = 200;
const SONG_CACHE_TTL_MS = 60 * 60 * 1000; // 1 jam
const songInfoCache = new Map();

function readSongCache(cacheKey) {
  const entry = songInfoCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > SONG_CACHE_TTL_MS) {
    songInfoCache.delete(cacheKey);
    return null;
  }
  // Sentuh entri supaya Map berperilaku LRU (yang paling lama dipakai dibuang).
  songInfoCache.delete(cacheKey);
  songInfoCache.set(cacheKey, entry);
  return entry.value;
}

function writeSongCache(cacheKey, value) {
  songInfoCache.set(cacheKey, { value, savedAt: Date.now() });
  // Buang entri tertua bila melewati kapasitas.
  while (songInfoCache.size > SONG_CACHE_MAX_ENTRIES) {
    const oldestKey = songInfoCache.keys().next().value;
    songInfoCache.delete(oldestKey);
  }
}

/**
 * Ambil userId dari header Authorization tanpa menolak request.
 * Kuota AI bersifat tambahan: user tanpa token (atau token kedaluwarsa) tetap
 * boleh memakai endpoint seperti sebelumnya, hanya tidak dihitung.
 */
function decodeUserFromRequest(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  const token = typeof header === 'string' ? header.replace('Bearer ', '') : '';
  if (!token) return {};
  try {
    const payload = jwt.decode(token);
    if (!payload || typeof payload !== 'object') return {};
    return { userId: payload.userId || payload.id || null };
  } catch {
    return {};
  }
}

import 'dotenv/config';
import busboy from 'busboy';
import jwt from 'jsonwebtoken';
import { buildTranscribePrompt, parseTranscriptionResponse } from '../src/modules/chord-transcriber/transcribePrompt.js';

async function readJson(req) {
  // Vercel mengisi req.body sebagai OBJEK (sudah di-parse) atau STRING JSON,
  // tergantung runtime. Versi lama hanya menerima objek; bila body berupa
  // string, ia dilewatkan ke pembaca stream yang sudah habis → hasil {} →
  // handler menjawab 400 "Title required" walau klien mengirim body benar.
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') {
      if (!req.body.trim()) return {};
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
  }
  if (typeof req.on !== 'function') return {};
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

// --- AI Setlist Recommendation Handler ---
async function handleRecommendSetlist(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const body = await readJson(req);
    const genre = (body.genre || '').toString();
    const mood = (body.mood || '').toString();
    const numSongs = parseInt(body.numSongs, 10) || 6;

    // Ambil daftar lagu dari database (songs table)
    // Path relatif di-import di-resolve terhadap file INI (api/), jadi harus
    // '../server/_turso.js' — pola yang sama dipakai _audit.js. Versi lama
    // './_turso.js' tidak pernah ada dan membuat modul gagal di-resolve.
    const { getTursoClient } = await import('../server/_turso.js');
    const client = getTursoClient();
    let query = 'SELECT id, title, artist, genre FROM songs';
    const params = [];
    const filters = [];
    if (genre) {
      filters.push('LOWER(genre) LIKE ?');
      params.push(`%${genre.toLowerCase()}%`);
    }
    if (filters.length > 0) {
      query += ' WHERE ' + filters.join(' AND ');
    }
    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(numSongs);
    const rows = await client.execute(query, params);
    let songs = (rows.rows || []).map(r => ({ id: r.id, title: r.title, artist: r.artist, genre: r.genre }));

    // Jika hasil kurang dari numSongs, tambahkan random dari semua lagu
    if (songs.length < numSongs) {
      const allRows = await client.execute('SELECT id, title, artist, genre FROM songs ORDER BY RANDOM() LIMIT ?', [numSongs]);
      const allSongs = (allRows.rows || []).map(r => ({ id: r.id, title: r.title, artist: r.artist, genre: r.genre }));
      // Gabungkan tanpa duplikat
      const seen = new Set(songs.map(s => s.id));
      for (const s of allSongs) {
        if (!seen.has(s.id) && songs.length < numSongs) {
          songs.push(s);
          seen.add(s.id);
        }
      }
    }

    // (Opsional) Jika ingin AI, bisa panggil LLM di sini untuk urutkan/beri alasan
    // Untuk sekarang, return langsung
    res.status(200).json({ songs });
  } catch (err) {
    console.error('AI recommend setlist error:', err);
    res.status(500).json({ error: 'Gagal mendapatkan rekomendasi setlist', message: err.message });
  }
}

export default async function handler(req, res) {
  const url = req.url || '';
  if (url.startsWith('/song-search')) return await handleSongSearch(req, res);
  if (url.startsWith('/popular-songs')) {
    return res.status(404).json({
      error: 'Endpoint ini tidak digunakan lagi. Gunakan /api/songs?include=trending untuk data trending YouTube.'
    });
  }
  if (url.startsWith('/chord-transcribe')) return await handleChordTranscribe(req, res);
  if (url.startsWith('/transcribe')) return await handleTranscribe(req, res);
  if (url.startsWith('/recommend-setlist')) return await handleRecommendSetlist(req, res);
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
    let finalText = '';
    let lastStatus = 500;
    let lastMessage = 'Gemini API gagal';
    const attemptedModels = [];

    for (const candidateModel of buildGeminiModelCandidates(model)) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${apiKey}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });
      const data = await resp.json();
      if (resp.ok) {
        finalText = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '';
        return res.status(200).json({ text: finalText, modelUsed: candidateModel, attemptedModels });
      }

      const message = data?.error?.message || 'Gemini API gagal';
      attemptedModels.push({ model: candidateModel, status: resp.status, message });
      lastStatus = resp.status;
      lastMessage = message;
      console.error(`Gemini API error (model: ${candidateModel}):`, data);

      const deniedAccess = isGeminiProjectDeniedAccess(resp.status, message);
      if (!deniedAccess) {
        break;
      }
    }

    return res.status(lastStatus).json({
      error: lastMessage,
      attemptedModels,
      suggestion: 'Model yang diminta ditolak untuk project ini. Gunakan model umum seperti gemini-2.5-flash atau aktifkan akses model preview di project Google Cloud.',
    });
  } catch (err) {
    console.error('API /api/ai error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

// --- Song search helpers ---
const GEMINI_JSON_FORMAT_INSTRUCTIONS = `Berikan informasi dalam format JSON dengan field:\n- artist: nama artis/penyanyi\n- key: kunci musik (C, D, E, F, G, A, B atau minor variants seperti Cm, Dm, dll) atau null jika tidak diketahui\n- tempo: tempo BPM sebagai angka atau null jika tidak diketahui\n- genre: genre/style musik (pop, rock, jazz, classical, dll) atau null jika tidak diketahui\n- arrangement_style: gaya aransemen (akustik, full band, unplugged, dll)\n- keyboard_patch: string penjelasan patch keyboard yang digunakan dan bagaimana patch tersebut dipakai dalam lagu (misal: "EP1 untuk intro dan verse, Pad untuk chorus, Strings untuk bridge") atau null jika tidak diketahui\n- lyrics: lirik lagu lengkap (string, jika ada, tanpa penjelasan tambahan)\n\nHanya return JSON tanpa penjelasan tambahan.`;

/**
 * Build the Gemini prompt for song metadata lookup.
 */
function buildSongInfoPrompt(title, artist) {
  if (!artist) {
    return `Cari informasi lagu berjudul "${title}". Jika diketahui, berikan juga nama artis/penyanyi. ${GEMINI_JSON_FORMAT_INSTRUCTIONS} Contoh:\n{"artist": "John Doe", "key": "G", "tempo": 120, "genre": "pop", "arrangement_style": "full band", "keyboard_patch": "EP1 untuk intro, Pad untuk chorus", "lyrics": "Ini lirik lagu..."}`;
  }
  return `Cari informasi lagu "${title}" oleh "${artist}". ${GEMINI_JSON_FORMAT_INSTRUCTIONS} Contoh:\n{"artist": "${artist}", "key": "G", "tempo": 120, "genre": "pop", "arrangement_style": "akustik", "keyboard_patch": "EP1 untuk intro, Pad untuk chorus", "lyrics": "Ini lirik lagu..."}`;
}

/**
 * Ask Gemini for structured song metadata, walking the supported model list
 * until one answers. Never throws.
 *
 * @returns {Promise<{success: boolean, fields: Object, modelName: string|null, debug: Object}>}
 */
async function fetchSongInfoFromGemini(prompt) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const deniedModels = new Set();
  let lastError = null;

  for (const modelName of GEMINI_TEXT_MODELS_SUPPORTED) {
    if (deniedModels.has(modelName)) continue;
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        modelName,
        fields: {
          artist: parsed.artist || null,
          key: parsed.key || null,
          tempo: parsed.tempo || null,
          genre: parsed.genre || null,
          arrangementStyle: parsed.arrangement_style || null,
          keyboardPatch: parsed.keyboard_patch || null,
          lyrics: parsed.lyrics || null,
        },
        debug: {},
      };
    } catch (err) {
      lastError = err;
      console.error(`Gemini API error (model: ${modelName}):`, err);
      if (isGeminiProjectDeniedAccess(err?.status, err?.message)) {
        deniedModels.add(modelName);
      }
      // Lanjut ke model berikutnya untuk toleransi akses/quota/preview restrictions
    }
  }

  const message = lastError?.message || '';
  const isQuotaError = Boolean(
    lastError && (lastError.status === 429 || message.includes('429') || message.toLowerCase().includes('quota'))
  );
  return {
    success: false,
    modelName: null,
    fields: {},
    debug: {
      geminiError: isQuotaError ? 'Gemini API quota exceeded' : (lastError?.message || 'Gemini API gagal'),
      geminiQuota: isQuotaError,
    },
  };
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
    // Log supaya penyebab 400 langsung terlihat (body kosong vs field hilang).
    console.warn('[ai/song-search] title kosong. Body diterima:', {
      keys: body && typeof body === 'object' ? Object.keys(body) : typeof body,
      url: req.url,
    });
    return res.status(400).json({ error: 'Title required' });
  }
  // Cache key based on title and artist (case-insensitive)
  const cacheKey = `${title.toLowerCase()}|${(artist || '').toLowerCase()}`;
  const cachedResult = readSongCache(cacheKey);
  if (cachedResult) {
    return res.status(200).json({ ...cachedResult, cached: true });
  }

  // Kuota AI Autofill per user per bulan. Hanya panggilan yang benar-benar
  // memakai Gemini (cache miss + ada API key) yang dihitung.
  let usageClient = null;
  let usageUserId = null;
  try {
    const { userId } = decodeUserFromRequest(req);
    usageUserId = userId;
    if (userId && process.env.GEMINI_API_KEY) {
      const { getTursoClient } = await import('../server/_turso.js');
      const { checkQuota } = await import('../server/_aiUsage.js');
      usageClient = getTursoClient();
      const quota = await checkQuota(usageClient, userId);
      if (!quota.allowed) {
        return res.status(429).json({
          error: 'Kuota AI Autofill habis',
          message: `Batas ${quota.usage.limit} pemakaian/bulan tercapai. Sisa: ${quota.usage.remaining}.`,
          usage: quota.usage,
        });
      }
    }
  } catch (quotaError) {
    // Fail-open: masalah DB tidak boleh mematikan fitur.
    console.warn('AI quota check skipped:', quotaError?.message || quotaError);
  }

  try {
    const results = {
      artist: null,
      key: null,
      tempo: null,
      genre: null,
      arrangementStyle: null, // new field
      keyboardPatch: null,    // new field
      youtubeId: null,
      lyrics: null,
      debug: {}
    };

    // YouTube TIDAK lagi dicari otomatis: user memilih video sendiri lewat
    // tombol "Cari video" (modal, query bisa diubah). Autofill hanya mengurus
    // metadata lagu lewat Gemini.
    results.youtubeId = null;

    // Gemini song info
    if (process.env.GEMINI_API_KEY) {
      const gemini = await fetchSongInfoFromGemini(buildSongInfoPrompt(title, artist));
      // Catat pemakaian setelah panggilan Gemini dilakukan (berhasil atau tidak —
      // kuota vendor tetap terpakai untuk request yang gagal di sisi respons).
      if (usageClient && usageUserId) {
        const { incrementUsage } = await import('../server/_aiUsage.js');
        await incrementUsage(usageClient, usageUserId);
      }
      Object.assign(results, gemini.fields);
      results.debug = { ...results.debug, ...gemini.debug };
      if (gemini.success) {
        results.debug.geminiModel = gemini.modelName;
      } else {
        // Tetap return hasil field lain yang tidak bergantung Gemini.
        // Jangan return error status, biarkan frontend handle error dari debug.geminiError
        //
        // JANGAN di-cache: entri yang gagal (mis. kuota Gemini habis) akan
        // diputar ulang ke semua permintaan berikutnya, sehingga youtubeId /
        // metadata tidak pernah terisi lagi sampai server di-restart.
        return res.status(200).json(results);
      }
    }

    // Always return artist (from input or AI)
    if (!results.artist) results.artist = artist || null;

    // Cache hanya hasil yang lengkap (Gemini sukses) — kegagalan tidak di-cache
    // karena bisa pulih sendiri tanpa restart server.
    // Salin objek: objek yang sama masih dipegang pemanggil, dan cache tidak
    // boleh ikut berubah bila pemanggil memutasi respons.
    writeSongCache(cacheKey, { ...results, debug: { ...results.debug } });
    return res.status(200).json(results);
  } catch (error) {
    console.error('Error in song search:', error);
    return res.status(500).json({ error: 'Failed to search song information', message: error.message, details: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
}

// --- Spotify helpers ---
// Spotify integration removed: feature deprecated.

// --- AI Chord & Sheet Music Transcriber handler ---
// Menerima multipart:
//   - audio   : file rekaman (mp3/wav/m4a/ogg/webm)  -> dikirim inline ke Gemini
//   - midi    : file .mid (opsional)                 -> diparsing di klien, dipakai sebagai teks
//   - prompt  : prompt siap pakai dari klien
//   - sourceName, sourceType, hasAudio
const MAX_TRANSCRIBE_AUDIO_BYTES = 18 * 1024 * 1024; // batas aman inline request Gemini

function readMultipartFields(req, { fileFields = ['audio', 'midi'], maxFileBytes = MAX_TRANSCRIBE_AUDIO_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers, limits: { fileSize: maxFileBytes, files: 4 } });
    const fields = {};
    const files = {};
    bb.on('field', (name, value) => {
      fields[name] = value;
    });
    bb.on('file', (fieldname, file, info) => {
      if (!fileFields.includes(fieldname)) {
        file.resume();
        return;
      }
      const chunks = [];
      let total = 0;
      let truncated = false;
      file.on('data', (chunk) => {
        total += chunk.length;
        if (total <= maxFileBytes) chunks.push(chunk);
      });
      file.on('limit', () => { truncated = true; });
      file.on('end', () => {
        files[fieldname] = {
          buffer: Buffer.concat(chunks),
          mimeType: info.mimeType || 'application/octet-stream',
          fileName: info.filename || '',
          truncated,
        };
      });
      file.on('error', reject);
    });
    bb.on('close', () => resolve({ fields, files }));
    bb.on('error', reject);
    req.pipe(bb);
  });
}

async function handleChordTranscribe(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY tidak diset' });
  }

  try {
    const { fields, files } = await readMultipartFields(req);
    const audio = files.audio;
    const midi = files.midi;
    if (audio?.truncated) {
      return res.status(413).json({
        error: `File audio terlalu besar. Maksimal ${Math.round(MAX_TRANSCRIBE_AUDIO_BYTES / (1024 * 1024))} MB — potong rekaman atau unggah bagian per bagian.`,
      });
    }
    if ((!audio || audio.buffer.length === 0) && (!midi || midi.buffer.length === 0)) {
      return res.status(400).json({ error: 'File audio atau MIDI diperlukan' });
    }

    const sourceType = (fields.sourceType || (midi && !audio ? 'midi' : 'audio')).toString();
    let prompt = (fields.prompt || '').toString().trim();
    if (prompt.length > 20000) prompt = prompt.slice(0, 20000);
    if (!prompt) {
      // Fallback bila klien lama belum mengirim prompt.
      prompt = buildTranscribePrompt({
        sourceType,
        sourceName: fields.sourceName || audio?.fileName || midi?.fileName || '',
        keyHint: fields.keyHint || '',
        midiSummary: (fields.midiSummary || '').toString(),
      });
    }

    const parts = [];
    if (audio && audio.buffer.length > 0) {
      parts.push({
        inlineData: {
          mimeType: audio.mimeType || 'audio/mpeg',
          data: audio.buffer.toString('base64'),
        },
      });
    }
    parts.push({ text: prompt });

    const requestedModel = (fields.model || '').toString() || DEFAULT_GEMINI_AUDIO_MODEL;
    let text = '';
    let modelUsed = null;
    let lastStatus = 500;
    let lastMessage = 'Gemini API gagal';
    const attemptedModels = [];

    for (const candidateModel of buildGeminiModelCandidates(requestedModel)) {
      const modelStart = Date.now();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${apiKey}`;
      let resp;
      let data = {};
      try {
        resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            // thinkingBudget 0: audio recorder tidak butuh chain-of-thought dan
            // model thinking bisa menggantung >60 detik (timeout di klien).
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          signal: AbortSignal.timeout(GEMINI_AUDIO_REQUEST_TIMEOUT_MS),
        });
        data = await resp.json().catch(() => ({}));
      } catch (err) {
        const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
        const message = timedOut
          ? `Model ${candidateModel} tidak merespons dalam ${GEMINI_AUDIO_REQUEST_TIMEOUT_MS / 1000} detik.`
          : (err?.message || 'Gagal menghubungi Gemini');
        attemptedModels.push({ model: candidateModel, status: timedOut ? 504 : 0, message, ms: Date.now() - modelStart });
        lastStatus = timedOut ? 504 : 502;
        lastMessage = message;
        console.error(`Chord transcribe error (model: ${candidateModel}):`, message);
        continue;
      }
      if (resp.ok) {
        text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || '';
        if (text.trim()) {
          modelUsed = candidateModel;
          break;
        }
        lastMessage = `Model ${candidateModel} mengembalikan jawaban kosong.`;
        attemptedModels.push({ model: candidateModel, status: 200, message: lastMessage, ms: Date.now() - modelStart });
        continue;
      }
      const message = data?.error?.message || 'Gemini API gagal';
      attemptedModels.push({ model: candidateModel, status: resp.status, message, ms: Date.now() - modelStart });
      lastStatus = resp.status;
      lastMessage = message;
      console.error(`Chord transcribe error (model: ${candidateModel}):`, message);

      // Lolos ke model berikutnya hanya untuk masalah yang bersifat model:
      //   404 = model tidak tersedia untuk API key ini,
      //   429 = kuota model habis,
      //   503 = model sedang kelebihan beban ("high demand").
      // 400/403/413 = masalah request/akses project -> percuma mencoba model lain.
      const retryable = resp.status === 404 || resp.status === 429 || resp.status >= 500;
      if (!retryable) break;
    }

    if (!modelUsed) {
      const overloaded = attemptedModels.some((attempt) => /high demand|overloaded|unavailable/i.test(attempt.message || ''));
      return res.status(lastStatus).json({
        error: lastMessage,
        attemptedModels,
        suggestion: overloaded
          ? 'Semua model sedang kelebihan beban. Tunggu 1–2 menit lalu coba lagi, atau unggah file MIDI untuk hasil instan tanpa antrean model.'
          : 'Coba lagi sebentar lagi. Jika memakai file audio, unggah file MIDI lebih dulu jika tersedia — hasilnya lebih akurat.',
      });
    }

    const result = parseTranscriptionResponse(text);
    return res.status(200).json({
      success: true,
      ...result,
      raw: undefined,
      sourceType,
      modelUsed,
      attemptedModels,
    });
  } catch (error) {
    console.error('Chord transcribe error:', error);
    return res.status(500).json({
      error: error.message || 'Gagal mentranskripsi audio',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
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
