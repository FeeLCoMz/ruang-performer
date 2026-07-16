// Unified endpoint for gigs (konser) and practice (latihan)
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

// type: 'gig' | 'practice'
function getTable(type) {
  if (type === 'gig') return 'gigs';
  if (type === 'practice') return 'practice_sessions';
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

export default async function handler(req, res) {
  if (!verifyToken(req, res)) return;


  // Use Express params for route matching
  let type = req.params?.type;
  let id = req.params?.id || null;
  // Fallback: parse type from URL if not present (for Vercel)
  if (!type) {
    // Improved: match id with dashes (UUID)
    const match = req.url.match(/\/api\/events\/(gig|practice)(?:\/([^/?]+))?/);
    if (match) {
      type = match[1];
      id = match[2] || null;
    }
  }
  if (!type || (type !== 'gig' && type !== 'practice')) {
    res.status(400).json({ error: 'Invalid route' });
    return;
  }
  const table = getTable(type);
  const client = getTursoClient();
  const userId = req.user?.userId || req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (type === 'practice') {
      await ensurePracticeSchema(client);
      await ensurePracticeStatsTable(client);
    }

    if (id) {
      // GET single
      if (req.method === 'GET') {
        if (type === 'gig') {
          const result = await client.execute(
            `SELECT g.id, g.bandId, g.date, g.venue, g.city, g.fee, g.setlistId, g.notes, g.createdAt, g.updatedAt, b.name as bandName, s.name as setlistName FROM gigs g LEFT JOIN bands b ON g.bandId = b.id LEFT JOIN setlists s ON g.setlistId = s.id WHERE g.id = ? AND (g.userId = ? OR g.bandId IN (SELECT bandId FROM band_members WHERE userId = ?)) LIMIT 1`,
            [id, userId, userId]
          );
          const row = result.rows?.[0] || null;
          if (!row) return res.status(404).json({ error: 'Gig not found' });
          res.status(200).json({ ...row });
          return;
        } else {
          const result = await client.execute(
            `SELECT ps.id, ps.bandId, ps.date, ps.duration, ps.songs, ps.songMeta, ps.notes, ps.createdAt, ps.updatedAt, b.name as bandName
             FROM practice_sessions ps
             LEFT JOIN bands b ON ps.bandId = b.id
             WHERE ps.id = ?
               AND ps.bandId IN (
                 SELECT bandId FROM band_members
                 WHERE userId = ?
                   AND (status IS NULL OR lower(status) IN ('active', 'accepted', 'member'))
               )
             LIMIT 1`,
            [id, userId]
          );
          const row = result.rows?.[0] || null;
          if (!row) return res.status(404).json({ error: 'Practice session not found' });
          res.status(200).json(parsePracticeRow(row));
          return;
        }
      }
      // PUT/PATCH single
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const body = await readJson(req);
        const now = new Date().toISOString();
        if (type === 'gig') {
          // Permission check for gig
          const gigCheck = await client.execute(`SELECT userId, bandId FROM gigs WHERE id = ?`, [id]);
          const gig = gigCheck.rows?.[0];
          if (!gig) return res.status(404).json({ error: 'Gig not found' });
          let canEdit = false;
          if (gig.userId === userId) canEdit = true;
          else if (gig.bandId) {
            const bandMember = await client.execute(`SELECT 1 FROM band_members WHERE bandId = ? AND userId = ? AND status = 'active' LIMIT 1`, [gig.bandId, userId]);
            if (bandMember.rows?.length > 0) canEdit = true;
          }
          if (!canEdit) return res.status(403).json({ error: 'Forbidden - insufficient permission to edit gig' });
          await client.execute(`UPDATE gigs SET bandId = COALESCE(?, bandId), date = COALESCE(?, date), venue = COALESCE(?, venue), city = COALESCE(?, city), fee = COALESCE(?, fee), setlistId = COALESCE(?, setlistId), notes = COALESCE(?, notes), updatedAt = ? WHERE id = ?`, [body.bandId ?? null, body.date ?? null, body.venue ?? null, body.city ?? null, body.fee ?? null, body.setlistId ?? null, body.notes ?? null, now, id]);
          res.status(200).json({ id });
          return;
        } else {
          const sessionResult = await client.execute(
            `SELECT id, bandId, date, duration, songs, songMeta, notes FROM practice_sessions WHERE id = ? LIMIT 1`,
            [id]
          );
          const existing = sessionResult.rows?.[0];
          if (!existing) return res.status(404).json({ error: 'Practice session not found' });

          const canEdit = await requireBandPermission(client, res, {
            bandId: existing.bandId,
            userId,
            permission: PERMISSIONS.SETLIST_EDIT,
          });
          if (!canEdit) return;

          const existingParsed = parsePracticeRow(existing);
          const nextSongs = body.songs !== undefined
            ? normalizeSongIds(body.songs)
            : existingParsed.songs;
          const sourceSongMeta = body.songMeta !== undefined
            ? body.songMeta
            : existingParsed.songMeta;
          const nextSongMeta = normalizeSongMeta(sourceSongMeta, nextSongs);

          await client.execute(
            `UPDATE practice_sessions
             SET date = ?, duration = ?, songs = ?, songMeta = ?, notes = ?, updatedAt = ?
             WHERE id = ?`,
            [
              body.date ?? existing.date,
              body.duration ?? existing.duration,
              JSON.stringify(nextSongs),
              JSON.stringify(nextSongMeta),
              body.notes ?? existing.notes,
              now,
              id,
            ]
          );

          await rebuildBandSongPracticeStats(client, existing.bandId);
          res.status(200).json({ success: true });
          return;
        }
      }
      // DELETE single
      if (req.method === 'DELETE') {
        if (type === 'gig') {
          const gigCheck = await client.execute(`SELECT userId, bandId FROM gigs WHERE id = ?`, [id]);
          const gig = gigCheck.rows?.[0];
          if (!gig) return res.status(404).json({ error: 'Gig not found' });
          let canDelete = false;
          if (gig.userId === userId) canDelete = true;
          else if (gig.bandId) {
            const bandMember = await client.execute(`SELECT 1 FROM band_members WHERE bandId = ? AND userId = ? AND status = 'active' LIMIT 1`, [gig.bandId, userId]);
            if (bandMember.rows?.length > 0) canDelete = true;
          }
          if (!canDelete) return res.status(403).json({ error: 'Forbidden - insufficient permission to delete gig' });
          await client.execute(`DELETE FROM gigs WHERE id = ?`, [id]);
          res.status(204).end();
          return;
        } else {
          const sessionResult = await client.execute(
            `SELECT id, bandId FROM practice_sessions WHERE id = ? LIMIT 1`,
            [id]
          );
          const existing = sessionResult.rows?.[0];
          if (!existing) return res.status(404).json({ error: 'Practice session not found' });

          const canDelete = await requireBandPermission(client, res, {
            bandId: existing.bandId,
            userId,
            permission: PERMISSIONS.SETLIST_DELETE,
          });
          if (!canDelete) return;

          await client.execute(`DELETE FROM practice_sessions WHERE id = ?`, [id]);
          await rebuildBandSongPracticeStats(client, existing.bandId);
          res.status(200).json({ success: true });
          return;
        }
      }
      res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    // GET all
    if (req.method === 'GET') {
      const { bandId } = req.query;
      if (type === 'gig') {
        // Allow all band members to see all gigs for their band
        let query = `SELECT g.id, g.bandId, g.date, g.venue, g.city, g.fee, g.setlistId, g.notes, g.createdAt, g.updatedAt, b.name as bandName, s.name as setlistName FROM gigs g LEFT JOIN bands b ON g.bandId = b.id LEFT JOIN setlists s ON g.setlistId = s.id WHERE (g.userId = ? OR g.bandId IN (SELECT bandId FROM band_members WHERE userId = ?))`;
        const params = [userId, userId];
        if (bandId) { query += ' AND g.bandId = ?'; params.push(bandId); }
        query += ' ORDER BY g.date DESC LIMIT 100';
        const result = await client.execute(query, params);
        res.status(200).json(result.rows || []);
        return;
      } else {
        let query = `SELECT ps.id, ps.bandId, ps.date, ps.duration, ps.songs, ps.songMeta, ps.notes, ps.createdAt, ps.updatedAt, b.name as bandName
                     FROM practice_sessions ps
                     LEFT JOIN bands b ON ps.bandId = b.id
                     WHERE ps.bandId IN (
                       SELECT bandId FROM band_members
                       WHERE userId = ?
                         AND (status IS NULL OR lower(status) IN ('active', 'accepted', 'member'))
                     )`;
        const params = [userId];
        if (bandId) { query += ' AND ps.bandId = ?'; params.push(bandId); }
        query += ' ORDER BY datetime(ps.date) DESC';
        const result = await client.execute(query, params);
        const sessions = (result.rows || []).map((row) => parsePracticeRow(row));
        res.status(200).json(sessions);
        return;
      }
    }
    // POST create
    if (req.method === 'POST') {
      const body = await readJson(req);
      const now = new Date().toISOString();
      if (type === 'gig') {
        const id = randomUUID();
        await client.execute(`INSERT INTO gigs (id, bandId, userId, date, venue, city, fee, setlistId, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, body.bandId ?? null, userId, body.date ?? null, body.venue ?? '', body.city ?? '', body.fee ?? null, body.setlistId ?? null, body.notes ?? '', now, now]);
        res.status(201).json({ id });
        return;
      } else {
        if (!body.bandId) return res.status(400).json({ error: 'Band is required' });
        if (!body.date) return res.status(400).json({ error: 'Date is required' });

        const canCreate = await requireBandPermission(client, res, {
          bandId: body.bandId,
          userId,
          permission: PERMISSIONS.SETLIST_CREATE,
        });
        if (!canCreate) return;

        const id = randomUUID();
        const practiceColumns = await client.execute(`PRAGMA table_info(practice_sessions)`);
        const columnNames = new Set((practiceColumns.rows || []).map((row) => row.name));
        const creatorColumn = columnNames.has('createdBy') ? 'createdBy' : 'userId';

        const songs = normalizeSongIds(body.songs);
        const songMeta = normalizeSongMeta(body.songMeta, songs);

        await client.execute(
          `INSERT INTO practice_sessions (id, bandId, ${creatorColumn}, date, duration, songs, songMeta, notes, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            body.bandId,
            userId,
            body.date,
            body.duration || null,
            JSON.stringify(songs),
            JSON.stringify(songMeta),
            body.notes || '',
            now,
            now,
          ]
        );

        await rebuildBandSongPracticeStats(client, body.bandId);
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
