import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { randomUUID } from 'crypto';
import { writeAuditLog, getRequestMeta } from '../_audit.js';
import { PERMISSIONS, hasPermission as hasPermissionUtil } from '../../src/utils/permissionUtils.js';

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

export function normalizeSongId(songId) {
  if (songId === null || songId === undefined) return '';
  return String(songId).trim();
}

export function dedupeSongIds(songIds = []) {
  const seenSongIds = new Set();
  const dedupedSongs = [];
  for (const songId of songIds) {
    const normalizedSongId = normalizeSongId(songId);
    if (!normalizedSongId || normalizedSongId === 'null' || normalizedSongId === 'undefined') {
      continue;
    }
    if (!seenSongIds.has(normalizedSongId)) {
      seenSongIds.add(normalizedSongId);
      dedupedSongs.push(normalizedSongId);
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

async function getUserBandRole(client, bandId, userId) {
  if (!client || !bandId || !userId) return null;
  const result = await client.execute(
    `SELECT role FROM band_members WHERE bandId = ? AND userId = ? LIMIT 1`,
    [bandId, userId]
  );
  return result.rows?.[0]?.role || null;
}

async function ensureSetlistPermission(client, userId, bandId, requiredPermission, setlistOwnerUserId = null) {
  if (!userId) return { allowed: false, reason: 'Unauthenticated' };

  if (!bandId) {
    return {
      allowed: String(setlistOwnerUserId || '') === String(userId),
      reason: 'Personal setlist requires owner access'
    };
  }

  const role = await getUserBandRole(client, bandId, userId);
  if (!role) {
    return { allowed: false, reason: 'User is not a member of this band' };
  }

  return {
    allowed: hasPermissionUtil(role, requiredPermission),
    reason: 'Insufficient permissions for this band setlist',
    role
  };
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

  if (rows.length === 0) return;

  // Satu batch, bukan satu round-trip HTTP per baris.
  const preferredKeyStatements = rows.map((row) => ({
    sql: `INSERT INTO band_song_preferences (id, bandId, songId, preferredKey, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(bandId, songId)
          DO UPDATE SET preferredKey = excluded.preferredKey, updatedAt = excluded.updatedAt`,
    args: [randomUUID(), bandId, row.songId, row.preferredKey, nowIso, nowIso]
  }));
  await executeBatch(client, preferredKeyStatements);
}

/**
 * Jalankan beberapa statement tulis dalam SATU round-trip (Turso remote).
 * Fallback ke eksekusi berurutan bila client tidak punya `batch` (mis. mock di test).
 */
async function executeBatch(client, statements) {
  if (!Array.isArray(statements) || statements.length === 0) return;
  if (typeof client.batch === 'function') {
    await client.batch(statements, 'write');
    return;
  }
  for (const statement of statements) {
    await client.execute(statement);
  }
}

/**
 * Sinkronkan isi setlist_songs ke urutan `songIds` tanpa menghapus lalu
 * menulis ulang semuanya. Hanya lagu yang berubah yang disentuh:
 * - lagu baru di posisi belakang -> 1 INSERT
 * - lagu yang dibuang          -> DELETE
 * - lagu yang bergeser         -> UPDATE position (hanya bila berubah)
 * Semua statement dikirim lewat satu batch.
 */
async function syncSetlistSongs(client, setId, songIds, bodyMeta, preferredKeyMap, nowIso) {
  const existingResult = await client.execute(
    `SELECT song_id, position, meta FROM setlist_songs WHERE setlist_id = ?`,
    [setId]
  );
  const existingRows = new Map();
  // rows bisa berupa array atau array-like (Turso) — iterasi generik aman untuk keduanya.
  for (const row of Array.from(existingResult?.rows || [])) {
    existingRows.set(normalizeSongId(row.song_id), row);
  }

  const incoming = new Set(songIds);
  const statements = [];
  const touchedMetaSongIds = [];

  for (const existingSongId of existingRows.keys()) {
    if (!incoming.has(existingSongId)) {
      statements.push({
        sql: `DELETE FROM setlist_songs WHERE setlist_id = ? AND song_id = ?`,
        args: [setId, existingSongId]
      });
    }
  }

  for (let i = 0; i < songIds.length; i++) {
    const songId = songIds[i];
    const rawMetaObj = (bodyMeta && bodyMeta[songId]) ? bodyMeta[songId] : {};
    const metaObj = applyBandPreferredKey(rawMetaObj, preferredKeyMap.get(songId));
    const nextMetaJson = JSON.stringify(metaObj);
    const existingRow = existingRows.get(songId);

    if (!existingRow) {
      statements.push({
        sql: `INSERT INTO setlist_songs (setlist_id, song_id, position, meta, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(setlist_id, song_id)
              DO UPDATE SET position = excluded.position, meta = excluded.meta, updatedAt = excluded.updatedAt`,
        args: [setId, songId, i, nextMetaJson, nowIso, nowIso]
      });
      continue;
    }

    const positionChanged = Number(existingRow.position) !== i;
    const metaChanged = (existingRow.meta || '{}') !== nextMetaJson;
    if (positionChanged || metaChanged) {
      statements.push({
        sql: `UPDATE setlist_songs SET position = ?, meta = ?, updatedAt = ?
              WHERE setlist_id = ? AND song_id = ?`,
        args: [i, nextMetaJson, nowIso, setId, songId]
      });
    }
    if (rawMetaObj && typeof rawMetaObj === 'object' && rawMetaObj.key) {
      touchedMetaSongIds.push(songId);
    }
  }

  await executeBatch(client, statements);
  return touchedMetaSongIds;
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
          const songs = (songRows.rows?.map(r => normalizeSongId(r.song_id)) || []).filter(Boolean);
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
            // Alias agar konsumen (SongChordsPage offline/direct-link) dapat
            // membaca meta override key dengan field yang sama seperti endpoint
            // daftar setlist.
            setlistSongMeta: songKeys,
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
        const normalizedMetaPatch = body?.setlistSongMetaPatch && typeof body.setlistSongMetaPatch === 'object' && !Array.isArray(body.setlistSongMetaPatch)
          ? body.setlistSongMetaPatch
          : null;
        // userId ikut diambil: setlist pribadi (bandId NULL) hanya boleh diubah pemiliknya.
        const setlistRowResult = await client.execute(
          `SELECT bandId, userId FROM setlists WHERE id = ? LIMIT 1`,
          [idStr]
        );
        const existingSetlistRow = setlistRowResult.rows?.[0] || null;
        if (!existingSetlistRow) {
          res.status(404).json({ error: 'Setlist not found' });
          return;
        }
        const effectiveBandId = body.bandId !== undefined ? body.bandId : existingSetlistRow.bandId;
        const dedupedSongs = Array.isArray(body.songs) ? dedupeSongIds(body.songs) : [];

        // BandId yang dikirim body tidak boleh berbeda dari band setlist aslinya,
        // kalau tidak setlist pribadi bisa diklaim ke band lain (bandId NULL -
        // bandId baru) hanya dengan mengirim field bandId.
        if (existingSetlistRow.bandId ? String(existingSetlistRow.bandId) !== String(effectiveBandId || '') : Boolean(effectiveBandId)) {
          res.status(403).json({ error: 'Tidak boleh memindahkan setlist ke band lain lewat update' });
          return;
        }

        const permissionCheck = await ensureSetlistPermission(
          client,
          userId,
          existingSetlistRow.bandId,
          PERMISSIONS.SETLIST_EDIT,
          existingSetlistRow.userId
        );
        if (!permissionCheck.allowed) {
          res.status(403).json({ error: permissionCheck.reason });
          return;
        }

        // Update setlist main fields
        await client.execute(
             `UPDATE setlists SET
               name = COALESCE(?, name),
               description = COALESCE(?, description),
               completedSongs = COALESCE(?, completedSongs),
               updatedAt = ?
             WHERE id = ?`,
            [
              body.name ?? null,
              body.description ?? null,
              body.completedSongs ? JSON.stringify(body.completedSongs) : null,
              now,
              idStr,
            ]
          );
        // Update setlist_songs: diff terhadap isi sekarang (bukan delete-all +
        // insert-all), lalu kirim semuanya dalam satu batch.
        if (Array.isArray(body.songs)) {
          const preferredKeyMap = await getBandPreferredKeyMap(client, effectiveBandId, dedupedSongs);
          const touchedMetaSongIds = await syncSetlistSongs(
            client, idStr, dedupedSongs, body.setlistSongMeta, preferredKeyMap, now
          );

          const metaForPreferences = {};
          for (const songId of touchedMetaSongIds || []) {
            metaForPreferences[songId] = body.setlistSongMeta[songId];
          }
          await upsertBandPreferredKeys(client, effectiveBandId, metaForPreferences, touchedMetaSongIds, now);
        } else if (normalizedMetaPatch) {
          const patchSongIds = dedupeSongIds(Object.keys(normalizedMetaPatch));
          const preferredKeyMap = await getBandPreferredKeyMap(client, effectiveBandId, patchSongIds);

          const existingMetaRows = patchSongIds.length > 0
            ? await client.execute(
              `SELECT song_id, meta FROM setlist_songs
               WHERE setlist_id = ? AND song_id IN (${patchSongIds.map(() => '?').join(', ')})`,
              [idStr, ...patchSongIds]
            )
            : { rows: [] };
          const existingMetaBySongId = new Map();
          for (const row of existingMetaRows.rows || []) {
            existingMetaBySongId.set(normalizeSongId(row.song_id), row.meta);
          }

          const updateStatements = [];
          for (const songId of patchSongIds) {
            const patchMetaObj = normalizeSongMeta(normalizedMetaPatch[songId]);
            const existingMetaRaw = existingMetaBySongId.get(songId);
            let existingMetaObj = {};
            try {
              existingMetaObj = existingMetaRaw ? JSON.parse(existingMetaRaw) : {};
            } catch {
              existingMetaObj = {};
            }

            const mergedMeta = applyBandPreferredKey(
              { ...normalizeSongMeta(existingMetaObj), ...patchMetaObj },
              preferredKeyMap.get(songId)
            );

            updateStatements.push({
              sql: `UPDATE setlist_songs
                    SET meta = ?, updatedAt = ?
                    WHERE setlist_id = ? AND song_id = ?`,
              args: [JSON.stringify(mergedMeta), now, idStr, songId]
            });
          }
          await executeBatch(client, updateStatements);

          await upsertBandPreferredKeys(client, effectiveBandId, normalizedMetaPatch, patchSongIds, now);
        } else {
          await upsertBandPreferredKeys(client, effectiveBandId, body.setlistSongMeta, Object.keys(body.setlistSongMeta || {}), now);
        }

        const { ipAddress, userAgent } = getRequestMeta(req);
        await writeAuditLog(client, {
          action: 'SETLIST_UPDATED',
          userId,
          bandId: existingSetlistRow.bandId || null,
          resourceId: idStr,
          resourceType: 'setlist',
          description: `Setlist diperbarui: ${body.name || idStr}`,
          ipAddress,
          userAgent,
        });

        res.status(200).json({ id: idStr });
        return;
      }
      if (req.method === 'DELETE') {
        // Permission constants (ESM compatible)
        const setlistLookup = await client.execute(
          `SELECT s.id, s.bandId, s.userId FROM setlists s WHERE s.id = ? LIMIT 1`,
          [idStr]
        );
        const targetSetlist = setlistLookup.rows?.[0] || null;
        if (!targetSetlist) {
          res.status(404).json({ error: 'Setlist not found' });
          return;
        }

        const permissionCheck = await ensureSetlistPermission(
          client,
          userId,
          targetSetlist.bandId,
          PERMISSIONS.SETLIST_DELETE,
          targetSetlist.userId
        );
        if (!permissionCheck.allowed) {
          res.status(403).json({ error: permissionCheck.reason });
          return;
        }

        await client.execute(`DELETE FROM setlists WHERE id = ?`, [idStr]);

        const { ipAddress, userAgent } = getRequestMeta(req);
        await writeAuditLog(client, {
          action: 'SETLIST_DELETED',
          userId,
          bandId: targetSetlist.bandId || null,
          resourceId: idStr,
          resourceType: 'setlist',
          description: `Setlist dihapus: ${idStr}`,
          ipAddress,
          userAgent,
        });

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
        const permissionCheck = await ensureSetlistPermission(client, userId, bandId, PERMISSIONS.SETLIST_CREATE);
        if (!permissionCheck.allowed) {
          res.status(403).json({ error: permissionCheck.reason });
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
        // Insert setlist_songs dalam satu batch, bukan satu round-trip per lagu.
        if (Array.isArray(body.songs)) {
          const insertStatements = dedupedSongs.map((songId, i) => {
            const rawMetaObj = (body.setlistSongMeta && body.setlistSongMeta[songId]) ? body.setlistSongMeta[songId] : {};
            const metaObj = applyBandPreferredKey(rawMetaObj, preferredKeyMap.get(songId));
            return {
              sql: `INSERT INTO setlist_songs (setlist_id, song_id, position, meta, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(setlist_id, song_id)
                    DO UPDATE SET position = excluded.position, meta = excluded.meta, updatedAt = excluded.updatedAt`,
              args: [id, songId, i, JSON.stringify(metaObj), now, now]
            };
          });
          await executeBatch(client, insertStatements);
        }
        await upsertBandPreferredKeys(client, bandId, body.setlistSongMeta, dedupedSongs, now);

        const { ipAddress, userAgent } = getRequestMeta(req);
        await writeAuditLog(client, {
          action: 'SETLIST_CREATED',
          userId,
          bandId: bandId || null,
          resourceId: id,
          resourceType: 'setlist',
          description: `Setlist dibuat: ${name}`,
          changes: { songCount: dedupedSongs.length },
          ipAddress,
          userAgent,
        });

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
          // Sinkronkan isi setlist_songs dengan payload (diff + satu batch).
          if (Array.isArray(body.songs)) {
            await syncSetlistSongs(client, id, dedupedSongs, body.setlistSongMeta, preferredKeyMap, now);
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
