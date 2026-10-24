// Unified endpoint for gigs (konser)
import { getTursoClient } from '../_turso.js';
import { randomUUID } from 'crypto';
import { verifyToken } from '../_auth.js';
import { PERMISSIONS, hasPermission } from '../../src/utils/permissionUtils.js';

const ACTIVE_MEMBER_STATUSES = ['active', 'accepted', 'member'];

async function readJson(req) {
  if (req.body) return req.body;
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

// type: 'gig'
function getTable(type) {
  if (type === 'gig') return 'gigs';
  throw new Error('Invalid type');
}

function parseJsonSafe(value, fallback) {
  try {
    if (value == null || value === '') return fallback;
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  } catch {
    return fallback;
  }
}

function normalizeSongIds(rawSongs) {
  if (!Array.isArray(rawSongs)) return [];
  const seen = new Set();
  const normalized = [];

  for (const rawItem of rawSongs) {
    const rawId = rawItem?.songId ?? rawItem?.id ?? rawItem;
    if (rawId == null || rawId === '') continue;
    const songId = String(rawId);
    if (seen.has(songId)) continue;
    seen.add(songId);
    normalized.push(songId);
  }

  return normalized;
}

function normalizeSongMeta(rawSongMeta, songIds) {
  const source = rawSongMeta && typeof rawSongMeta === 'object' && !Array.isArray(rawSongMeta)
    ? rawSongMeta
    : {};

  const nextMeta = {};
  for (const songId of songIds) {
    const item = source[songId] || {};
    const practiced = item.practiced === true;
    const parsedRating = Number.parseInt(item.rating, 10);
    const rating = Number.isInteger(parsedRating) && parsedRating >= 1 && parsedRating <= 5
      ? parsedRating
      : null;
    nextMeta[songId] = { practiced, rating };
  }

  return nextMeta;
}

function parsePracticeRow(row) {
  const songs = normalizeSongIds(parseJsonSafe(row?.songs, []));
  const songMeta = normalizeSongMeta(parseJsonSafe(row?.songMeta, {}), songs);
  return {
    ...row,
    songs,
    songMeta,
  };
}

async function ensurePracticeSchema(client) {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS practice_sessions (
      id TEXT PRIMARY KEY,
      bandId TEXT NOT NULL,
      date TEXT NOT NULL,
      duration INTEGER,
      songs TEXT,
      songMeta TEXT,
      notes TEXT,
      createdBy TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT,
      deletedAt TEXT,
      FOREIGN KEY (bandId) REFERENCES bands(id) ON DELETE CASCADE,
      FOREIGN KEY (createdBy) REFERENCES users(id)
    )`
  );

  const columnsResult = await client.execute(`PRAGMA table_info(practice_sessions)`);
  const columns = new Set((columnsResult.rows || []).map((row) => String(row.name)));

  if (!columns.has('songMeta')) {
    await client.execute(`ALTER TABLE practice_sessions ADD COLUMN songMeta TEXT`);
    columns.add('songMeta');
  }

  if (!columns.has('createdBy') && !columns.has('userId')) {
    await client.execute(`ALTER TABLE practice_sessions ADD COLUMN createdBy TEXT`);
    columns.add('createdBy');
  }

  return columns;
}

async function ensurePracticeStatsTable(client) {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS band_song_practice_stats (
      id TEXT PRIMARY KEY,
      bandId TEXT NOT NULL,
      songId TEXT NOT NULL,
      sessionCount INTEGER NOT NULL DEFAULT 0,
      practicedCount INTEGER NOT NULL DEFAULT 0,
      ratingAvg REAL,
      lastPracticedAt TEXT,
      lastRating INTEGER,
      updatedAt TEXT,
      FOREIGN KEY (bandId) REFERENCES bands(id) ON DELETE CASCADE,
      FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE,
      UNIQUE(bandId, songId)
    )`
  );

  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_band_song_practice_stats_band_song
     ON band_song_practice_stats(bandId, songId)`
  );
}

async function getBandRole(client, bandId, userId) {
  const result = await client.execute(
    `SELECT role, status FROM band_members WHERE bandId = ? AND userId = ? LIMIT 1`,
    [bandId, userId]
  );
  const row = result.rows?.[0];
  if (!row) return null;

  const normalizedStatus = String(row.status || 'active').toLowerCase();
  if (!ACTIVE_MEMBER_STATUSES.includes(normalizedStatus)) return null;

  return row.role || 'member';
}

async function requireBandPermission(client, res, { bandId, userId, permission }) {
  const role = await getBandRole(client, bandId, userId);
  if (!role) {
    res.status(403).json({ error: 'Forbidden - band membership required' });
    return false;
  }
  if (!hasPermission(role, permission)) {
    res.status(403).json({ error: 'Forbidden - insufficient permission' });
    return false;
  }
  return true;
}

export { requireBandPermission };

/**
 * Cek akses tulis pada gig.
 *
 * - Gig pribadi (tanpa bandId): hanya pembuatnya.
 * - Gig band: pembuat selalu boleh; anggota band lain hanya jika rolenya punya
 *   permission yang diminta (owner/admin → gig:edit / gig:delete, member tidak).
 *
 * Mengembalikan `{ ok, role }`; `role` dipakai untuk audit/keperluan lain.
 */
async function checkGigWriteAccess(client, { gig, userId, permission }) {
  const creatorId = gig.userId ?? gig.createdBy;
  if (creatorId && creatorId === userId) return { ok: true, role: 'creator' };
  if (!gig.bandId) return { ok: false, role: null };

  const role = await getBandRole(client, gig.bandId, userId);
  if (!role) return { ok: false, role: null };
  return { ok: hasPermission(role, permission), role };
}

async function rebuildBandSongPracticeStats(client, bandId) {
  const sessionsResult = await client.execute(
    `SELECT songs, songMeta, date
     FROM practice_sessions
     WHERE bandId = ?
     ORDER BY datetime(date) ASC, date ASC`,
    [bandId]
  );

  const aggregateBySong = new Map();

  for (const row of sessionsResult.rows || []) {
    const parsed = parsePracticeRow(row);
    const sessionDate = parsed.date || null;

    for (const songId of parsed.songs) {
      const current = aggregateBySong.get(songId) || {
        sessionCount: 0,
        practicedCount: 0,
        ratingTotal: 0,
        ratedCount: 0,
        lastPracticedAt: null,
        lastRating: null,
      };

      current.sessionCount += 1;

      const meta = parsed.songMeta?.[songId] || {};
      const isPracticed = meta.practiced === true;
      const hasRating = Number.isInteger(meta.rating);

      if (isPracticed) {
        current.practicedCount += 1;
        if (!current.lastPracticedAt || (sessionDate && sessionDate >= current.lastPracticedAt)) {
          current.lastPracticedAt = sessionDate;
          current.lastRating = hasRating ? meta.rating : current.lastRating;
        }
      }

      if (hasRating) {
        current.ratingTotal += meta.rating;
        current.ratedCount += 1;
      }

      aggregateBySong.set(songId, current);
    }
  }

  await client.execute(`DELETE FROM band_song_practice_stats WHERE bandId = ?`, [bandId]);

  const now = new Date().toISOString();
  for (const [songId, stat] of aggregateBySong.entries()) {
    const ratingAvg = stat.ratedCount > 0 ? Number((stat.ratingTotal / stat.ratedCount).toFixed(2)) : null;
    await client.execute(
      `INSERT INTO band_song_practice_stats (
        id, bandId, songId, sessionCount, practicedCount, ratingAvg, lastPracticedAt, lastRating, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        bandId,
        songId,
        stat.sessionCount,
        stat.practicedCount,
        ratingAvg,
        stat.lastPracticedAt,
        stat.lastRating,
        now,
      ]
    );
  }
}

export const GIG_STATUSES = ['planned', 'confirmed', 'cancelled', 'done'];
const GIG_SELECT_COLUMNS = 'g.id, g.bandId, g.date, g.venue, g.city, g.fee, g.setlistId, g.notes, g.status, g.userId, g.createdAt, g.updatedAt, b.name as bandName, s.name as setlistName';

function normalizeGigStatus(value, fallback = 'planned') {
  const normalized = String(value || '').trim().toLowerCase();
  return GIG_STATUSES.includes(normalized) ? normalized : fallback;
}

// Kolom status ditambahkan pada skema lama yang belum memilikinya (data lama
// otomatis dianggap 'planned'; status diturunkan dari tanggal di sisi klien).
async function ensureGigSchema(client) {
  const columnsResult = await client.execute(`PRAGMA table_info(gigs)`);
  const columns = new Set((columnsResult.rows || []).map((row) => String(row.name)));
  if (columns.size > 0 && !columns.has('status')) {
    await client.execute(`ALTER TABLE gigs ADD COLUMN status TEXT DEFAULT 'planned'`);
  }
}

export default async function handler(req, res) {
  if (!verifyToken(req, res)) return;


  // Use Express params for route matching
  let type = req.params?.type;
  let id = req.params?.id || null;
  // Fallback: parse type from URL if not present (for Vercel)
  if (!type) {
    // Improved: match id with dashes (UUID)
    const match = req.url.match(/\/api\/events\/(gig)(?:\/([^/?]+))?/);
    if (match) {
      type = match[1];
      id = match[2] || null;
    }
  }
  if (!type || type !== 'gig') {
    res.status(400).json({ error: 'Invalid route' });
    return;
  }
  const table = getTable(type);
  const client = getTursoClient();
  const userId = req.user?.userId || req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  await ensureGigSchema(client);

  // Normalisasi nilai kosong: '' → null agar kolom opsional benar-benar dikosongkan
  // (bukan tersimpan sebagai string kosong).
  const normalizeId = (value) => {
    if (value === undefined || value === '') return null;
    return value;
  };
  const normalizeFee = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const normalizeDateTime = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined; // penanda: tidak valid
    return value;
  };

  try {
    if (id) {
      // GET single
      if (req.method === 'GET') {
        if (type === 'gig') {
          const result = await client.execute(
            `SELECT ${GIG_SELECT_COLUMNS} FROM gigs g LEFT JOIN bands b ON g.bandId = b.id LEFT JOIN setlists s ON g.setlistId = s.id WHERE g.id = ? AND (g.userId = ? OR g.bandId IN (SELECT bandId FROM band_members WHERE userId = ?)) LIMIT 1`,
            [id, userId, userId]
          );
          const row = result.rows?.[0] || null;
          if (!row) return res.status(404).json({ error: 'Gig not found' });
          res.status(200).json({ ...row });
          return;
        }
      }
      // PUT/PATCH single
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const body = await readJson(req);
        const now = new Date().toISOString();
        if (type === 'gig') {
          // Permission check for gig (berbasis role, bukan sekadar keanggotaan band)
          const gigCheck = await client.execute(`SELECT userId, bandId FROM gigs WHERE id = ?`, [id]);
          const gig = gigCheck.rows?.[0];
          if (!gig) return res.status(404).json({ error: 'Gig not found' });
          const canAccess = await checkGigWriteAccess(client, { gig, userId, permission: PERMISSIONS.GIG_EDIT });
          if (!canAccess.ok) return res.status(403).json({ error: 'Forbidden - insufficient permission to edit gig' });
          const nextDate = normalizeDateTime(body.date);
          if (nextDate === undefined) return res.status(400).json({ error: 'Invalid date' });
          await client.execute(`UPDATE gigs SET bandId = ?, date = COALESCE(?, date), venue = ?, city = ?, fee = ?, setlistId = ?, notes = ?, status = COALESCE(?, status), updatedAt = ? WHERE id = ?`, [normalizeId(body.bandId), nextDate, body.venue || '', body.city || '', normalizeFee(body.fee), normalizeId(body.setlistId), body.notes || '', body.status === undefined || body.status === null || body.status === '' ? null : normalizeGigStatus(body.status), now, id]);
          res.status(200).json({ id });
          return;
        }
      }
      // DELETE single
      if (req.method === 'DELETE') {
        if (type === 'gig') {
          const gigCheck = await client.execute(`SELECT userId, bandId FROM gigs WHERE id = ?`, [id]);
          const gig = gigCheck.rows?.[0];
          if (!gig) return res.status(404).json({ error: 'Gig not found' });
          const canAccess = await checkGigWriteAccess(client, { gig, userId, permission: PERMISSIONS.GIG_DELETE });
          if (!canAccess.ok) return res.status(403).json({ error: 'Forbidden - insufficient permission to delete gig' });
          await client.execute(`DELETE FROM gigs WHERE id = ?`, [id]);
          res.status(204).end();
          return;
        }
      }
      res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    // GET all
    if (req.method === 'GET') {
      const { bandId, year, month, limit } = req.query;
      if (type === 'gig') {
        // Allow all band members to see all gigs for their band
        let query = `SELECT ${GIG_SELECT_COLUMNS} FROM gigs g LEFT JOIN bands b ON g.bandId = b.id LEFT JOIN setlists s ON g.setlistId = s.id WHERE (g.userId = ? OR g.bandId IN (SELECT bandId FROM band_members WHERE userId = ?))`;
        const params = [userId, userId];
        if (bandId) { query += ' AND g.bandId = ?'; params.push(bandId); }

        // Filter bulan/tahun dikerjakan di server supaya gigs lama tidak terpotong.
        // `date` disimpan sebagai ISO lokal (YYYY-MM-DDTHH:mm:ss) atau tanggal saja.
        const yearNum = Number.parseInt(year, 10);
        const hasYear = Number.isInteger(yearNum) && yearNum > 1900 && yearNum < 3000;
        if (hasYear) {
          query += ' AND substr(g.date, 1, 4) = ?';
          params.push(String(yearNum).padStart(4, '0'));
        }
        const monthNum = Number.parseInt(month, 10);
        const hasMonth = Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12;
        if (hasMonth) {
          query += ' AND substr(g.date, 6, 2) = ?';
          params.push(String(monthNum).padStart(2, '0'));
        }

        query += ' ORDER BY date(g.date) DESC, g.date DESC';

        // Pagination opsional (`limit`/`offset`); tanpa limit, semua gigs dikembalikan.
        const limitNum = Number.parseInt(limit, 10);
        if (Number.isInteger(limitNum) && limitNum > 0) {
          query += ' LIMIT ?';
          params.push(Math.min(limitNum, 500));
        }

        const result = await client.execute(query, params);
        res.status(200).json(result.rows || []);
        return;
      }
    }
    // POST create
    if (req.method === 'POST') {
      const body = await readJson(req);
      const now = new Date().toISOString();
      if (type === 'gig') {
        const id = randomUUID();
        const nextDate = normalizeDateTime(body.date);
        if (nextDate === undefined) return res.status(400).json({ error: 'Invalid date' });
        const values = [id, normalizeId(body.bandId), userId, nextDate, body.venue || '', body.city || '', normalizeFee(body.fee), normalizeId(body.setlistId), body.notes || '', normalizeGigStatus(body.status), now, now];
        await client.execute(`INSERT INTO gigs (id, bandId, userId, date, venue, city, fee, setlistId, notes, status, createdAt, updatedAt) VALUES (?, ?, ?)`,
          values);
        res.status(201).json({ id });
        return;
      }
    }
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/events error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
