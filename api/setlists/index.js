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
          // meta: { songId: metaObj }
          const songKeys = {};
          (songRows.rows || []).forEach(r => {
            try {
              songKeys[r.song_id] = r.meta ? JSON.parse(r.meta) : {};
            } catch {
              songKeys[r.song_id] = {};
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
          // Deduplicate song IDs while preserving order
          const seenSongIds = new Set();
          const dedupedSongs = [];
          for (const songId of body.songs) {
            if (!seenSongIds.has(songId)) {
              seenSongIds.add(songId);
              dedupedSongs.push(songId);
            }
          }
          for (let i = 0; i < dedupedSongs.length; i++) {
            const songId = dedupedSongs[i];
            const metaObj = (body.setlistSongMeta && body.setlistSongMeta[songId]) ? body.setlistSongMeta[songId] : {};
            await client.execute(
              `INSERT INTO setlist_songs (setlist_id, song_id, position, meta, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [idStr, songId, i, JSON.stringify(metaObj), now, now]
            );
          }
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

    if (req.method === 'GET') {      
      // Get only setlists user has access to
      // Rules: setlists owned by user OR setlists from bands where user is a member
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
         ORDER BY (s.updatedAt IS NULL) ASC, datetime(s.updatedAt) DESC, datetime(s.createdAt) DESC`,
        [userId, userId]
      );
      // For each setlist, fetch songs and meta from setlist_songs
      const setlists = [];
      for (const row of rows.rows ?? []) {
        const songRows = await client.execute(
          `SELECT song_id, position, meta FROM setlist_songs WHERE setlist_id = ? ORDER BY position ASC`,
          [row.id]
        );
        const songs = songRows.rows?.map(r => r.song_id) || [];
        const setlistSongMeta = {};
        (songRows.rows || []).forEach(r => {
          try {
            setlistSongMeta[r.song_id] = r.meta ? JSON.parse(r.meta) : {};
          } catch {
            setlistSongMeta[r.song_id] = {};
          }
        });
        setlists.push({
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
        });
      }
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
          // Deduplicate song IDs while preserving order
          const seenSongIds = new Set();
          const dedupedSongs = [];
          for (const songId of body.songs) {
            if (!seenSongIds.has(songId)) {
              seenSongIds.add(songId);
              dedupedSongs.push(songId);
            }
          }
          for (let i = 0; i < dedupedSongs.length; i++) {
            const songId = dedupedSongs[i];
            const metaObj = (body.setlistSongMeta && body.setlistSongMeta[songId]) ? body.setlistSongMeta[songId] : {};
            await client.execute(
              `INSERT INTO setlist_songs (setlist_id, song_id, position, meta, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [id, songId, i, JSON.stringify(metaObj), now, now]
            );
          }
        }
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
            // Deduplicate song IDs while preserving order
            const seenSongIds = new Set();
            const dedupedSongs = [];
            for (const songId of body.songs) {
              if (!seenSongIds.has(songId)) {
                seenSongIds.add(songId);
                dedupedSongs.push(songId);
              }
            }
            for (let i = 0; i < dedupedSongs.length; i++) {
              const songId = dedupedSongs[i];
              const metaObj = (body.setlistSongMeta && body.setlistSongMeta[songId]) ? body.setlistSongMeta[songId] : {};
              await client.execute(
                `INSERT INTO setlist_songs (setlist_id, song_id, position, meta, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [id, songId, i, JSON.stringify(metaObj), now, now]
              );
            }
          }
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
