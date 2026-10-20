/**
 * POST /api/songs/bulk
 *
 * Menambah banyak lagu (lirik & chord) dalam satu permintaan — dipakai modul
 * Bulk Add Lirik & Chord.
 *
 * Body:
 *   { songs: Array<{ title, artist?, key?, tempo?, time_signature?, genre?,
 *                    lyrics?, youtubeId?, keyboardPatch?, sheetMusicXml?,
 *                    bandId? }> }
 *
 * Respons 200:
 *   { ids: string[], created: number }
 *
 * Respons 400 (validasi global): error per lagu, dan TIDAK ada yang disimpan.
 * Sebelum insert, endpoint memastikan semua judul valid dan viewer boleh
 * menulis ke band yang dituju; setelah itu insert per item dalam satu batch
 * dan hapus kembali lagu yang baru dibuat bila ada kegagalan di tengah jalan.
 */
import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { randomUUID } from 'crypto';

// Schema check cukup sekali per instance server (sama seperti /api/songs).
let _schemaEnsured = false;
let _schemaEnsurePromise = null;

async function ensureSchema(client) {
  if (_schemaEnsured) return;
  if (!_schemaEnsurePromise) {
    _schemaEnsurePromise = (async () => {
      await client.execute(
        `CREATE TABLE IF NOT EXISTS songs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          artist TEXT,
          youtubeId TEXT,
          lyrics TEXT,
          key TEXT,
          tempo TEXT,
          genre TEXT,
          time_markers TEXT,
          time_signature TEXT,
          userId TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT
        )`
      );
      const columnsResult = await client.execute(`PRAGMA table_info(songs)`);
      const columns = (columnsResult.rows || []).map((row) => row.name);
      const extraColumns = {
        userId: 'TEXT',
        bandId: 'TEXT',
        time_signature: 'TEXT',
      };
      for (const [name, type] of Object.entries(extraColumns)) {
        if (!columns.includes(name)) {
          await client.execute(`ALTER TABLE songs ADD COLUMN ${name} ${type}`);
        }
      }
      _schemaEnsured = true;
    })().catch((error) => {
      _schemaEnsurePromise = null;
      throw error;
    });
  }
  await _schemaEnsurePromise;
}

async function readJson(req) {
  if (req.body) return req.body;
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sanitizeText(value, maxLen = 100) {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>"'`]/g, '').slice(0, maxLen);
}

function normalizeTempo(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(String(value).replace(/,/g, '.'), 10);
  return Number.isNaN(parsed) ? null : parsed.toString();
}


async function assertBandWriteAccess(client, bandId, userId) {
  if (!bandId) return true;
  const membership = await client.execute(
    `SELECT 1 FROM band_members
     WHERE bandId = ? AND userId = ?
       AND (status IS NULL OR lower(status) IN ('active', 'accepted', 'member'))
     LIMIT 1`,
    [bandId, String(userId)]
  );
  return Boolean(membership.rows?.length);
}

export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');

    if (!verifyToken(req, res)) return;

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = await readJson(req);
    const songs = Array.isArray(body) ? body : Array.isArray(body?.songs) ? body.songs : null;
    if (!songs) {
      res.status(400).json({ error: 'Body harus berisi array songs' });
      return;
    }
    if (songs.length === 0) {
      res.status(400).json({ error: 'Tidak ada lagu untuk disimpan' });
      return;
    }
      // Batas aman supaya satu permintaan tidak menghabiskan kuota database.
      if (songs.length > 1000) {
        res.status(400).json({ error: 'Maksimal 1000 lagu per proses bulk' });
        return;
      }

    const client = getTursoClient();
    await ensureSchema(client);

    // ---- Validasi menyeluruh dulu -------------------------------------------
    const failures = [];
    const prepared = songs.map((item, index) => {
      const source = item && typeof item === 'object' ? item : {};
      // Judul hanya dibersihkan dari spasi berlebih: karakter seperti `"`, `<`,
      // atau `'` adalah bagian dari judul lagu yang wajar (mis. "Don't Stop"),
      // jadi TIDAK boleh disanitasi — dulu sanitasi bisa mengosongkan judul yang
      // sebenarnya terisi sehingga simpan gagal dengan "Judul lagu wajib diisi".
      const rawTitle = typeof source.title === 'string' ? source.title.trim() : '';
      const title = rawTitle.replace(/\s+/g, ' ').slice(0, 200);
      if (!title) {
        failures.push({
          index,
          title: '',
          error: 'Judul lagu wajib diisi',
        });
      }
      return {
        index,
        title,
        // Judul asli untuk pesan error (sebelum normalisasi).
        displayTitle: rawTitle.slice(0, 100),
        artist: sanitizeText(source.artist, 100),
        genre: sanitizeText(source.genre, 50),
        key: sanitizeText(source.key, 20),
        youtubeId: sanitizeText(source.youtubeId, 60),
        // Lirik & chord TIDAK boleh disanitasi: karakter < > " ' ` adalah bagian
        // dari penulisan chord/lirik, dan menghapusnya merusak hasil bulk.
        lyrics: typeof source.lyrics === 'string' ? source.lyrics.slice(0, 50000) : '',
        tempo: normalizeTempo(source.tempo),
        timeSignature: sanitizeText(source.time_signature || source.timeSignature, 10) || '4/4',
        keyboardPatch: sanitizeText(source.keyboardPatch, 200),
        sheetMusicXml: typeof source.sheetMusicXml === 'string' ? source.sheetMusicXml : null,
        bandId: source.bandId ? String(source.bandId) : null,
      };
    });

    if (failures.length > 0) {
      // Pesan utama menyebut lagu mana yang bermasalah supaya user tidak perlu
      // menebak dari 20 lagu sekaligus.
      const firstFailure = failures[0];
      const firstTitle = prepared[firstFailure.index]?.displayTitle || `lagu #${firstFailure.index + 1}`;
      res.status(400).json({
        error:
          failures.length === 1
            ? `Lagu "${firstTitle}": ${firstFailure.error.toLowerCase()}`
            : `${failures.length} lagu belum valid (pertama: "${firstTitle}") — perbaiki dulu sebelum menyimpan.`,
        failures: failures.map((failure) => ({
          ...failure,
          blockNumber: failure.index + 1,
        })),
      });
      return;
    }

    // Cek izin tulis per band (biasanya semua lagu di bulk ditujukan ke band
    // yang sama, jadi hasilnya di-cache per bandId).
    const bandAccess = new Map();
    for (const item of prepared) {
      if (!item.bandId) continue;
      if (!bandAccess.has(item.bandId)) {
        bandAccess.set(item.bandId, await assertBandWriteAccess(client, item.bandId, userId));
      }
      if (!bandAccess.get(item.bandId)) {
        res.status(403).json({
          error: `Anda bukan anggota aktif band untuk lagu "${item.title}"`,
        });
        return;
      }
    }

    // ---- Simpan -------------------------------------------------------------
    // 341+ lagu dalam satu permintaan bisa melewati batas waktu function, dan
    // satu insert lambat membuat seluruh batch gagal. Chunk di bawah ini
    // membuat permintaan per 50 lagu, berurutan, supaya risiko timeout kecil.
    const CHUNK_SIZE = 50;
    const now = new Date().toISOString();
    const insertSql = `INSERT INTO songs
        (id, title, artist, youtubeId, lyrics, key, tempo, genre, time_markers,
         time_signature, arrangement_style, keyboard_patch, sheet_music_xml,
         userId, bandId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const createdIds = [];
    try {
      for (let offset = 0; offset < prepared.length; offset += CHUNK_SIZE) {
        const chunk = prepared.slice(offset, offset + CHUNK_SIZE);
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(chunk.map(async (item) => {
          const id = randomUUID();
          await client.execute(insertSql, [
            id,
            item.title,
            item.artist || null,
            item.youtubeId || null,
            item.lyrics || null,
            item.key || null,
            item.tempo,
            item.genre || null,
            null,
            item.timeSignature,
            null,
            item.keyboardPatch || null,
            item.sheetMusicXml || null,
            userId,
            item.bandId,
            now,
            now,
          ]);
          createdIds.push(id);
        }));
      }
    } catch (error) {
      // Rollback manual: hapus lagu yang sudah dibuat agar tidak setengah masuk.
      if (createdIds.length > 0) {
        for (let offset = 0; offset < createdIds.length; offset += 100) {
          const ids = createdIds.slice(offset, offset + 100);
          const placeholders = ids.map(() => '?').join(', ');
          // eslint-disable-next-line no-await-in-loop
          await client.execute(`DELETE FROM songs WHERE id IN (${placeholders})`, ids).catch(() => {});
        }
      }
      throw error;
    }

    res.status(201).json({ ids: createdIds, created: createdIds.length });
  } catch (error) {
    console.error('API /api/songs/bulk error:', error);
    res.status(500).json({
      error: 'Gagal menyimpan lagu secara massal',
      message: error?.message,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });
  }
}
