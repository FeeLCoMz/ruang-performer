import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { randomUUID } from 'crypto';

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

function dedupeSongIds(songIds = []) {
  const seenSongIds = new Set();
  const dedupedSongs = [];
  for (const songId of songIds) {
    if (!seenSongIds.has(songId)) {
      seenSongIds.add(songId);
      dedupedSongs.push(songId);
    }
  }
  return dedupedSongs;
}

function normalizeSongMeta(metaObj) {
  if (!metaObj || typeof metaObj !== 'object' || Array.isArray(metaObj)) {
    return {};
  }
  return { ...metaObj };
}

function applyBandPreferredKey(metaObj, preferredKey) {
  const normalizedMeta = normalizeSongMeta(metaObj);
  if (!normalizedMeta.key && preferredKey) {
    normalizedMeta.key = preferredKey;
  }
  return normalizedMeta;
}

async function getBandPreferredKeyMap(client, bandId, songIds = []) {
  const map = new Map();
  if (!bandId || !Array.isArray(songIds) || songIds.length === 0) {
    return map;
  }

  const placeholders = songIds.map(() => '?').join(', ');
  const rows = await client.execute(
    `SELECT songId, preferredKey
     FROM band_song_preferences
     WHERE bandId = ? AND songId IN (${placeholders})`,
    [bandId, ...songIds]
  );

  for (const row of rows.rows || []) {
    if (row.songId && row.preferredKey) {
      map.set(row.songId, row.preferredKey);
    }
  }

  return map;
}

async function upsertBandPreferredKeys(client, bandId, setlistSongMeta, allowedSongIds = [], nowIso) {
  if (!bandId || !setlistSongMeta || typeof setlistSongMeta !== 'object' || Array.isArray(setlistSongMeta)) {
    return;
  }

  const allowed = new Set(Array.isArray(allowedSongIds) ? allowedSongIds : []);
  const rows = Object.entries(setlistSongMeta)
    .filter(([songId]) => (allowed.size === 0 ? true : allowed.has(songId)))
    .map(([songId, metaObj]) => {
      const preferredKey = typeof metaObj?.key === 'string' ? metaObj.key.trim() : '';
      return { songId, preferredKey };
    })
    .filter(({ songId, preferredKey }) => songId && preferredKey);

  for (const row of rows) {
    await client.execute(
      `INSERT INTO band_song_preferences (id, bandId, songId, preferredKey, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(bandId, songId)
       DO UPDATE SET preferredKey = excluded.preferredKey, updatedAt = excluded.updatedAt`,
      [randomUUID(), bandId, row.songId, row.preferredKey, nowIso, nowIso]
    );
  }
}

export default async function handler(req, res) {
  try {
    // Verify JWT token first
    if (!verifyToken(req, res)) {
      return;
    }

    // Check if this is a request for a specific setlist ID
    const path = req.path || req.url.split('?')[0];
    const relativePath = path.replace(/^\/api\/setlists\/?/, '').replace(/^\//, '');
    const isIdRoute = relativePath && relativePath !== '';
    const id = isIdRoute ? relativePath : null;

    if (isIdRoute && (req.method === 'GET' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
      // --- Begin logic from [id].js ---
      const idStr = id ? String(id).trim() : '';
      if (!idStr) {
        res.status(400).json({ error: 'Missing setlist id' });
        return;
      }
      let client;
      const userId = req.user?.userId;
      try {
        client = getTursoClient();
      } catch (clientErr) {
        console.error(`[setlists/[id]] Failed to get Turso client:`, clientErr.message);
        res.status(500).json({ error: 'Database connection error', details: clientErr.message });
        return;
      }
      if (req.method === 'GET') {
        try {
          // Get setlist info
          const result = await client.execute(
            `SELECT s.id, s.name, s.description, s.bandId, s.completedSongs, s.createdAt, s.updatedAt, b.name as bandName
             FROM setlists s
             LEFT JOIN bands b ON s.bandId = b.id
             WHERE s.id = ?
             AND (s.bandId IS NULL OR EXISTS (
               SELECT 1 FROM band_members WHERE bandId = s.bandId AND userId = ?
             ))
             LIMIT 1`,
            [idStr, userId]
          );
          const row = result.rows?.[0] || null;
          if (!row) {
            res.status(404).json({ error: 'Setlist not found' });
            return;
          }
          // Get songs and meta from setlist_songs
          const songRows = await client.execute(
            `SELECT song_id, position, meta FROM setlist_songs WHERE setlist_id = ? ORDER BY position ASC`,
            [idStr]
          );
          const songs = songRows.rows?.map(r => r.song_id) || [];
          const preferredKeyMap = await getBandPreferredKeyMap(client, row.bandId, songs);
          // meta: { songId: metaObj }
          const songKeys = {};
          (songRows.rows || []).forEach(r => {
            try {
              const parsedMeta = r.meta ? JSON.parse(r.meta) : {};
              songKeys[r.song_id] = applyBandPreferredKey(parsedMeta, preferredKeyMap.get(r.song_id));
            } catch {
              songKeys[r.song_id] = applyBandPreferredKey({}, preferredKeyMap.get(r.song_id));
            }
          });
          res.status(200).json({
            id: row.id,
            name: row.name,
            description: row.description || '',
            bandId: row.bandId,
            bandName: row.bandName,
            songs,
            songKeys,
            completedSongs: (() => {
              try { return row.completedSongs ? JSON.parse(row.completedSongs) : {}; } catch (e) { return {}; }
            })(),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          });
          return;
        } catch (queryErr) {
          throw queryErr;
        }
      }
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const body = await readJson(req);
        const now = new Date().toISOString();
        const setlistRowResult = await client.execute(
          `SELECT bandId FROM setlists WHERE id = ? LIMIT 1`,
          [idStr]
        );
        const existingSetlistRow = setlistRowResult.rows?.[0] || null;
        if (!existingSetlistRow) {
          res.status(404).json({ error: 'Setlist not found' });
          return;
        }
        const effectiveBandId = body.bandId !== undefined ? body.bandId : existingSetlistRow.bandId;

        // Update setlist main fields
        await client.execute(
          `UPDATE setlists SET 
             name = COALESCE(?, name),
             description = COALESCE(?, description),
             bandId = COALESCE(?, bandId),
             completedSongs = COALESCE(?, completedSongs),
             updatedAt = ?
           WHERE id = ?`,
          [
            body.name ?? null,
            body.description ?? null,
            body.bandId !== undefined ? body.bandId : null,
            body.completedSongs ? JSON.stringify(body.completedSongs) : null,
            now,
            idStr,
          ]
        );
        // Update setlist_songs: remove all then insert new
        if (Array.isArray(body.songs)) {
          await client.execute(`DELETE FROM setlist_songs WHERE setlist_id = ?`, [idStr]);
          const dedupedSongs = dedupeSongIds(body.songs);
          const preferredKeyMap = await getBandPreferredKeyMap(client, effectiveBandId, dedupedSongs);
          for (let i = 0; i < dedupedSongs.length; i++) {
            const songId = dedupedSongs[i];
            const rawMetaObj = (body.setlistSongMeta && body.setlistSongMeta[songId]) ? body.setlistSongMeta[songId] : {};
            const metaObj = applyBandPreferredKey(rawMetaObj, preferredKeyMap.get(songId));
            await client.execute(
              `INSERT INTO setlist_songs (setlist_id, song_id, position, meta, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [idStr, songId, i, JSON.stringify(metaObj), now, now]
            );
          }

          await upsertBandPreferredKeys(client, effectiveBandId, body.setlistSongMeta, dedupedSongs, now);
        } else {
          await upsertBandPreferredKeys(client, effectiveBandId, body.setlistSongMeta, Object.keys(body.setlistSongMeta || {}), now);
        }
        res.status(200).json({ id: idStr });
        return;
      }
      if (req.method === 'DELETE') {
        // Permission constants (ESM compatible)
        const permUtils = await import('../../src/utils/permissionUtils.js');
        const SETLIST_DELETE = permUtils.PERMISSIONS.SETLIST_DELETE;
        const hasPermission = permUtils.hasPermission;
        const userRole = req.user?.role;
        if (!hasPermission(userRole, SETLIST_DELETE)) {
          res.status(403).json({ error: 'You do not have permission to delete setlists' });
          return;
        }
        // Check if user is band member or owner for this setlist
        const checkResult = await client.execute(
          `SELECT s.id FROM setlists s\n         WHERE s.id = ? \n         AND (s.bandId IS NULL OR EXISTS (\n           SELECT 1 FROM band_members WHERE bandId = s.bandId AND userId = ?\n         ))\n         LIMIT 1`,
          [idStr, userId]
        );
        if (!checkResult.rows || checkResult.rows.length === 0) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
        await client.execute(`DELETE FROM setlists WHERE id = ?`, [idStr]);
        res.status(204).end();
        return;
      }
      res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
      res.status(405).json({ error: 'Method not allowed' });
      return;
      // --- End logic from [id].js ---
    }

    const client = getTursoClient();
    const userId = req.user?.userId;
    const summaryParam = req.query?.summary || new URL(req.url, 'http://localhost').searchParams.get('summary');
    const isSummaryRequest = ['1', 'true', 'yes'].includes(String(summaryParam || '').toLowerCase());

    if (req.method === 'GET') {      
      // Get only setlists user has access to
      // Rules: setlists owned by user OR setlists from bands where user is a member
      if (isSummaryRequest) {
        const summaryRows = await client.execute(
          `SELECT s.id, s.name, s.description, s.bandId, s.createdAt, s.updatedAt,
                  b.name as bandName, u.username as userName, s.userId,
                  COALESCE(ss.song_count, 0) as songCount
           FROM setlists s
           LEFT JOIN bands b ON s.bandId = b.id
           LEFT JOIN users u ON s.userId = u.id
           LEFT JOIN (
             SELECT setlist_id, COUNT(*) as song_count
             FROM setlist_songs
             GROUP BY setlist_id
           ) ss ON ss.setlist_id = s.id
           WHERE (s.userId = ?)
              OR (s.bandId IS NOT NULL AND EXISTS (
                SELECT 1 FROM band_members WHERE bandId = s.bandId AND userId = ?
              ))
           ORDER BY datetime(s.createdAt) DESC, datetime(s.updatedAt) DESC`,
          [userId, userId]
        );

        const summarySetlists = (summaryRows.rows || []).map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description || '',
          bandId: row.bandId,
          bandName: row.bandName,
          userId: row.userId,
          userName: row.userName || '',
          songCount: Number(row.songCount || 0),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        }));

        res.status(200).json(summarySetlists);
        return;
      }

      const rows = await client.execute(
        `SELECT s.id, s.name, s.description, s.bandId, s.completedSongs, s.createdAt, s.updatedAt,
                b.name as bandName, u.username as userName, s.userId
         FROM setlists s
         LEFT JOIN bands b ON s.bandId = b.id
         LEFT JOIN users u ON s.userId = u.id
         WHERE (s.userId = ?)
            OR (s.bandId IS NOT NULL AND EXISTS (
              SELECT 1 FROM band_members WHERE bandId = s.bandId AND userId = ?
            ))
         ORDER BY datetime(s.createdAt) DESC, datetime(s.updatedAt) DESC`,
        [userId, userId]
      );
      const baseRows = rows.rows ?? [];
      const setlistIds = baseRows.map(row => row.id).filter(Boolean);
      const bandIds = [...new Set(baseRows.map(row => row.bandId).filter(Boolean))];

      // Avoid N+1 queries by fetching song rows in chunks and grouping in memory.
      const songRowsBySetlistId = new Map();
      if (setlistIds.length > 0) {
        const chunkSize = 200;
        for (let i = 0; i < setlistIds.length; i += chunkSize) {
          const chunk = setlistIds.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => '?').join(', ');
          const songRows = await client.execute(
            `SELECT setlist_id, song_id, position, meta
             FROM setlist_songs
             WHERE setlist_id IN (${placeholders})
             ORDER BY setlist_id ASC, position ASC`,
            chunk
          );

          for (const songRow of songRows.rows || []) {
            const list = songRowsBySetlistId.get(songRow.setlist_id) || [];
            list.push(songRow);
            songRowsBySetlistId.set(songRow.setlist_id, list);
          }
        }
      }

      const allSongIds = new Set();
      for (const groupedRows of songRowsBySetlistId.values()) {
        for (const songRow of groupedRows) {
          if (songRow.song_id) {
            allSongIds.add(songRow.song_id);
          }
        }
      }

      const preferredKeyByBandSong = new Map();
      if (bandIds.length > 0 && allSongIds.size > 0) {
        const bandPlaceholders = bandIds.map(() => '?').join(', ');
        const songPlaceholders = [...allSongIds].map(() => '?').join(', ');
        const preferredRows = await client.execute(
          `SELECT bandId, songId, preferredKey
           FROM band_song_preferences
           WHERE bandId IN (${bandPlaceholders})
             AND songId IN (${songPlaceholders})`,
          [...bandIds, ...allSongIds]
        );

        for (const preferredRow of preferredRows.rows || []) {
          if (preferredRow.bandId && preferredRow.songId && preferredRow.preferredKey) {
            preferredKeyByBandSong.set(`${preferredRow.bandId}::${preferredRow.songId}`, preferredRow.preferredKey);
          }
        }
      }

      const setlists = baseRows.map(row => {
        const groupedSongRows = songRowsBySetlistId.get(row.id) || [];
        const songs = groupedSongRows.map(r => r.song_id);
        const setlistSongMeta = {};

        for (const songRow of groupedSongRows) {
          const preferredKey = row.bandId ? preferredKeyByBandSong.get(`${row.bandId}::${songRow.song_id}`) : null;
          try {
            const parsedMeta = songRow.meta ? JSON.parse(songRow.meta) : {};
            setlistSongMeta[songRow.song_id] = applyBandPreferredKey(parsedMeta, preferredKey);
          } catch {
            setlistSongMeta[songRow.song_id] = applyBandPreferredKey({}, preferredKey);
          }
        }

        return {
          id: row.id,
          name: row.name,
          description: row.description || '',
          bandId: row.bandId,
          bandName: row.bandName,
          userId: row.userId,
          userName: row.userName || '',
          songs,
          setlistSongMeta,
          completedSongs: (() => {
            try {
              return row.completedSongs ? JSON.parse(row.completedSongs) : {};
            } catch (e) {
              return {};
            }
          })(),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        };
      });
      res.status(200).json(setlists);
      return;
    }

    if (req.method === 'POST') {
      const body = await readJson(req);

      // Simple sanitization
      function sanitize(str, maxLen = 100) {
        if (typeof str !== 'string') return '';
        return str.replace(/[<>"'`]/g, '').slice(0, maxLen);
      }

      // Validate and sanitize required fields
      const name = sanitize(body.name, 100);
      if (!name || name.length < 1) {
        res.status(400).json({ error: 'Setlist name is required' });
        return;
      }
      const description = sanitize(body.description || '', 300);
      let bandId = body.bandId || null;
      if (bandId) {
        bandId = sanitize(bandId, 50);
        const bandCheck = await client.execute(
          `SELECT 1 FROM band_members WHERE bandId = ? AND userId = ?`,
          [bandId, userId]
        );
        if (!bandCheck.rows || bandCheck.rows.length === 0) {
          res.status(403).json({ error: 'You are not a member of this band' });
          return;
        }
      }

      const id = body.id?.toString() || randomUUID();
      const now = new Date().toISOString();
      const dedupedSongs = Array.isArray(body.songs) ? dedupeSongIds(body.songs) : [];
      const preferredKeyMap = await getBandPreferredKeyMap(client, bandId, dedupedSongs);

      try {
        await client.execute(
          `INSERT INTO setlists (id, name, description, bandId, createdAt, updatedAt, userId)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            name,
            description,
            bandId,
            body.createdAt || now,
            now,
            userId,
          ]
        );
        // Insert setlist_songs
        if (Array.isArray(body.songs)) {
          for (let i = 0; i < dedupedSongs.length; i++) {
            const songId = dedupedSongs[i];
            const rawMetaObj = (body.setlistSongMeta && body.setlistSongMeta[songId]) ? body.setlistSongMeta[songId] : {};
            const metaObj = applyBandPreferredKey(rawMetaObj, preferredKeyMap.get(songId));
            await client.execute(
              `INSERT INTO setlist_songs (setlist_id, song_id, position, meta, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [id, songId, i, JSON.stringify(metaObj), now, now]
            );
          }
        }
        await upsertBandPreferredKeys(client, bandId, body.setlistSongMeta, dedupedSongs, now);
        res.status(201).json({ id });
      } catch (insertErr) {
        // Check if it's a duplicate key error
        if (insertErr.message && insertErr.message.includes('UNIQUE')) {
          // Setlist already exists, update instead
          await client.execute(
            `UPDATE setlists SET 
               name = ?, 
               description = ?,
               bandId = ?,
               updatedAt = ?,
               userId = ?
             WHERE id = ?`,
            [
              name,
              description,
              bandId,
              now,
              userId,
              id,
            ]
          );
          // Remove all old setlist_songs before re-insert
          await client.execute(`DELETE FROM setlist_songs WHERE setlist_id = ?`, [id]);
          if (Array.isArray(body.songs)) {
            for (let i = 0; i < dedupedSongs.length; i++) {
              const songId = dedupedSongs[i];
              const rawMetaObj = (body.setlistSongMeta && body.setlistSongMeta[songId]) ? body.setlistSongMeta[songId] : {};
              const metaObj = applyBandPreferredKey(rawMetaObj, preferredKeyMap.get(songId));
              await client.execute(
                `INSERT INTO setlist_songs (setlist_id, song_id, position, meta, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [id, songId, i, JSON.stringify(metaObj), now, now]
              );
            }
          }
          await upsertBandPreferredKeys(client, bandId, body.setlistSongMeta, dedupedSongs, now);
          res.status(200).json({ id });
        } else {
          throw insertErr;
        }
      }
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/setlists error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
