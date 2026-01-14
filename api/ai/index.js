import transcribeHandler from './transcribe.js';
import songSearchHandler from './song-search.js';

async function readJson(req) {
  if (req.body) return req.body;
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { 
        resolve(data ? JSON.parse(data) : {}); 
      }
      catch (e) { 
        reject(new Error(`Invalid JSON: ${e.message}`)); 
      }
    });
    req.on('error', reject);
  });
}

async function aiChatHandler(req, res) {
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
    if (system) {
      contents.push({ role: 'user', parts: [{ text: `System: ${system}` }] });
    }
    if (context) {
      contents.push({ role: 'user', parts: [{ text: `Context:\n${context}` }] });
    }
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

    // Extract text from candidates
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '';
    return res.status(200).json({ text });
  } catch (err) {
    console.error('API /api/ai error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export default async function handler(req, res) {
  // Route /song-search POST requests (path is relative to /api/ai)
  if (req.url.includes('/song-search') && req.method === 'POST') {
    return songSearchHandler(req, res);
  }

  // Route /transcribe POST requests (path is relative to /api/ai)
  if (req.url.includes('/transcribe') && req.method === 'POST') {
    return transcribeHandler(req, res);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Default to general AI chat handler
  return aiChatHandler(req, res);
}

