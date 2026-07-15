import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { randomUUID } from 'crypto';
import songIdHandler from './[id].js';

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

async function ensureSongsColumns(client) {
  const columnsResult = await client.execute(`PRAGMA table_info(songs)`);
  const columns = (columnsResult.rows || []).map(row => row.name);
  if (!columns.includes('userId')) {
    await client.execute(`ALTER TABLE songs ADD COLUMN userId TEXT`);
  }
  if (!columns.includes('bandId')) {
    await client.execute(`ALTER TABLE songs ADD COLUMN bandId TEXT`);
  }
  if (!columns.includes('time_signature')) {
    await client.execute(`ALTER TABLE songs ADD COLUMN time_signature TEXT`);
  }
}

async function ensureSongMasteryTable(client) {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS song_user_mastery (
      id TEXT PRIMARY KEY,
      songId TEXT NOT NULL,
      userId TEXT NOT NULL,
      mastered INTEGER NOT NULL DEFAULT 1,
      masteredAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT,
      FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(songId, userId)
    )`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_song_user_mastery_songId ON song_user_mastery(songId)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_song_user_mastery_userId ON song_user_mastery(userId)`
  );

  // Backfill from legacy table if it exists, so previous marks are preserved.
  const legacyTable = await client.execute(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'song_member_mastery' LIMIT 1`
  );
  if (legacyTable.rows?.length) {
    await client.execute(
      `INSERT OR IGNORE INTO song_user_mastery (id, songId, userId, mastered, masteredAt, createdAt, updatedAt)
       SELECT id, songId, userId, mastered, masteredAt, createdAt, updatedAt
       FROM song_member_mastery`
    );
  }
}

function toMasteryRows(rows) {
  return (rows?.rows || []).map((row) => ({
    userId: row.userId,
    username: row.username || '-',
    masteredAt: row.masteredAt || row.updatedAt || row.createdAt || null,
  }));
}

async function getSongMasteryList(client, songId) {
  const rows = await client.execute(
    `SELECT sm.userId, sm.masteredAt, sm.updatedAt, sm.createdAt, u.username
     FROM song_user_mastery sm
     LEFT JOIN users u ON u.id = sm.userId
     WHERE sm.songId = ? AND sm.mastered = 1
     ORDER BY datetime(COALESCE(sm.masteredAt, sm.updatedAt, sm.createdAt)) DESC`,
    [songId]
  );
  return toMasteryRows(rows);
}

async function getActiveBandMemberSet(client, bandId) {
  const members = await client.execute(
    `SELECT userId FROM band_members
     WHERE bandId = ?
       AND (
         status IS NULL
         OR lower(status) IN ('active', 'accepted', 'member')
       )`,
    [bandId]
  );
  return new Set((members.rows || []).map((row) => String(row.userId)));
}

async function filterMasteryForViewer(client, songBandId, masteryList, viewerUserId) {
  const normalizedViewerId = String(viewerUserId || '');
  if (!normalizedViewerId) return [];

  // Non-band songs: only show current user's own status.
  if (!songBandId) {
    return masteryList.filter((entry) => String(entry.userId) === normalizedViewerId);
  }

  const bandMembers = await getActiveBandMemberSet(client, songBandId);
  const isViewerInBand = bandMembers.has(normalizedViewerId);
  if (!isViewerInBand) {
    // Outside band: only own status is visible.
    return masteryList.filter((entry) => String(entry.userId) === normalizedViewerId);
  }

  // Same band: can see fellow band members plus own status.
  return masteryList.filter((entry) => {
    const entryUserId = String(entry.userId || '');
    return bandMembers.has(entryUserId) || entryUserId === normalizedViewerId;
  });
}

async function handleSongMastery(req, res, client, songId) {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const songResult = await client.execute(
    `SELECT id FROM songs WHERE id = ? LIMIT 1`,
    [songId]
  );
  const song = songResult.rows?.[0];
  if (!song) {
    res.status(404).json({ error: 'Song not found' });
    return;
  }

  if (req.method === 'GET') {
    const masteredByAll = await getSongMasteryList(client, songId);
    const masteredBy = await filterMasteryForViewer(client, song.bandId || null, masteredByAll, userId);
    res.status(200).json({ songId, masteredBy, isMasteredByCurrentUser: masteredByAll.some((entry) => String(entry.userId) === String(userId)) });
    return;
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const body = await readJson(req);
    const mastered = body?.mastered !== false;
    if (mastered) {
      const now = new Date().toISOString();
      await client.execute(
        `INSERT INTO song_user_mastery (id, songId, userId, mastered, masteredAt, createdAt, updatedAt)
         VALUES (?, ?, ?, 1, ?, ?, ?)
         ON CONFLICT(songId, userId) DO UPDATE SET
           mastered = 1,
           masteredAt = excluded.masteredAt,
           updatedAt = excluded.updatedAt`,
        [randomUUID(), songId, userId, now, now, now]
      );
    } else {
      await client.execute(
        `DELETE FROM song_user_mastery WHERE songId = ? AND userId = ?`,
        [songId, userId]
      );
    }

    const masteredByAll = await getSongMasteryList(client, songId);
    const masteredBy = await filterMasteryForViewer(client, song.bandId || null, masteredByAll, userId);
    res.status(200).json({
      songId,
      mastered,
      masteredBy,
      isMasteredByCurrentUser: masteredByAll.some((entry) => String(entry.userId) === String(userId)),
    });
    return;
  }

  res.setHeader('Allow', 'GET, PUT, PATCH');
  res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req, res) {
  try {
    // Verify JWT token first
    if (!verifyToken(req, res)) {
      return;
    }

    // Check if this is a request for a specific song ID
    const path = req.path || req.url.split('?')[0];
    const relativePath = path.replace(/^\/api\/songs\/?/, '').replace(/^\//, '');
    const pathSegments = relativePath ? relativePath.split('/').filter(Boolean) : [];
    if (pathSegments.length === 2 && pathSegments[1] === 'mastery') {
      const client = getTursoClient();
      await ensureSongsColumns(client);
      await ensureSongMasteryTable(client);
      return handleSongMastery(req, res, client, pathSegments[0]);
    }

    if (relativePath && (req.method === 'GET' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
      // Delegate to [id].js handler
      req.params = { ...req.params, id: relativePath };
      req.query = { ...req.query, id: relativePath };
      return songIdHandler(req, res);
    }

    const client = getTursoClient();

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
    await ensureSongsColumns(client);
    await ensureSongMasteryTable(client);

    if (req.method === 'GET') {
      const userId = req.user?.userId;
      const viewerId = String(userId || '');

      // Join ke tabel users untuk ambil nama kontributor
      const rows = await client.execute(
        `SELECT songs.id, songs.title, songs.artist, songs.youtubeId, songs.lyrics, songs.key, songs.tempo, songs.genre, songs.time_markers, songs.time_signature, songs.userId, songs.bandId, songs.createdAt, songs.updatedAt, songs.sheet_music_xml, users.username AS contributorUsername
         FROM songs
         LEFT JOIN users ON users.id = songs.userId
         ORDER BY (songs.updatedAt IS NULL) ASC, datetime(songs.updatedAt) DESC, datetime(songs.createdAt) DESC`
      );

      const masteryRows = await client.execute(
        `SELECT sm.songId, sm.userId, sm.masteredAt, sm.updatedAt, sm.createdAt, u.username
        FROM song_user_mastery sm
         LEFT JOIN users u ON u.id = sm.userId
         WHERE sm.mastered = 1`
      );
      const masteryMap = {};
      for (const row of masteryRows.rows || []) {
        if (!masteryMap[row.songId]) masteryMap[row.songId] = [];
        masteryMap[row.songId].push({
          userId: row.userId,
          username: row.username || '-',
          masteredAt: row.masteredAt || row.updatedAt || row.createdAt || null,
        });
      }

      const songBandIds = Array.from(new Set(
        (rows.rows || [])
          .map((row) => row.bandId)
          .filter((bandId) => bandId)
          .map((bandId) => String(bandId))
      ));

      const viewerBandsRows = await client.execute(
        `SELECT bandId FROM band_members
         WHERE userId = ?
           AND (
             status IS NULL
             OR lower(status) IN ('active', 'accepted', 'member')
           )`,
        [viewerId]
      );
      const viewerBandSet = new Set((viewerBandsRows.rows || []).map((row) => String(row.bandId)));

      const bandMemberMap = {};
      if (songBandIds.length > 0) {
        const placeholders = songBandIds.map(() => '?').join(', ');
        const membersRows = await client.execute(
          `SELECT bandId, userId FROM band_members
           WHERE bandId IN (${placeholders})
             AND (
               status IS NULL
               OR lower(status) IN ('active', 'accepted', 'member')
             )`,
          songBandIds
        );

        for (const member of membersRows.rows || []) {
          const bandKey = String(member.bandId);
          if (!bandMemberMap[bandKey]) bandMemberMap[bandKey] = new Set();
          bandMemberMap[bandKey].add(String(member.userId));
        }
      }

      const list = (rows.rows ?? []).map(row => ({
        ...(() => {
          const rawMasteredBy = masteryMap[row.id] || [];
          const rowBandId = row.bandId ? String(row.bandId) : null;
          let visibleMasteredBy = [];

          if (!rowBandId) {
            visibleMasteredBy = rawMasteredBy.filter((entry) => String(entry.userId) === viewerId);
          } else if (viewerBandSet.has(rowBandId)) {
            const allowedUsers = bandMemberMap[rowBandId] || new Set();
            visibleMasteredBy = rawMasteredBy.filter((entry) => {
              const entryUserId = String(entry.userId || '');
              return allowedUsers.has(entryUserId) || entryUserId === viewerId;
            });
          } else {
            visibleMasteredBy = rawMasteredBy.filter((entry) => String(entry.userId) === viewerId);
          }

          return {
            masteredBy: visibleMasteredBy,
            isMasteredByCurrentUser: rawMasteredBy.some((entry) => String(entry.userId) === viewerId),
          };
        })(),
        ...row,
        contributorName: row.contributorUsername, // alias agar frontend tetap pakai contributorName
        time_markers: row.time_markers ? JSON.parse(row.time_markers) : [],
        sheetMusicXml: row.sheet_music_xml || '',
        canMarkMastery: true,
      }));
      res.status(200).json(list);
      return;
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const now = new Date().toISOString();
      const userId = req.user?.userId;

      // Simple sanitization
      function sanitize(str, maxLen = 100) {
        if (typeof str !== 'string') return '';
        return str.replace(/[<>"'`]/g, '').slice(0, maxLen);
      }

      const upsertOne = async (item) => {
        // Validasi title wajib
        const title = sanitize(item.title, 100);
        if (!title || title.length < 1) {
          throw new Error('Judul lagu wajib diisi');
        }
        const artist = sanitize(item.artist, 100);
        const genre = sanitize(item.genre, 50);
        const key = sanitize(item.key, 20);
        const youtubeId = sanitize(item.youtubeId, 30);
        // Pastikan tempo disimpan sebagai string integer tanpa koma
        let tempoStr = null;
        if (item.tempo !== undefined && item.tempo !== null && item.tempo !== '') {
          const tempoInt = parseInt(String(item.tempo).replace(/,/g, '.'), 10);
          if (!isNaN(tempoInt)) tempoStr = tempoInt.toString();
        }
        const id = item.id?.toString() || randomUUID();
        await client.execute(
          `INSERT INTO songs (id, title, artist, youtubeId, lyrics, key, tempo, genre, time_markers, time_signature, arrangement_style, keyboard_patch, sheet_music_xml, userId, bandId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             artist = excluded.artist,
             youtubeId = excluded.youtubeId,
             lyrics = excluded.lyrics,
             key = excluded.key,
             tempo = excluded.tempo,
             genre = excluded.genre,
             time_markers = excluded.time_markers,
             time_signature = excluded.time_signature,
             arrangement_style = excluded.arrangement_style,
             keyboard_patch = excluded.keyboard_patch,
             sheet_music_xml = excluded.sheet_music_xml,
             bandId = excluded.bandId,
             updatedAt = excluded.updatedAt`,
          [
            id,
            title,
            artist || null,
            youtubeId || null,
            item.lyrics || null,
            key || null,
            tempoStr,
            genre || null,
            (Array.isArray(item.timestamps) ? JSON.stringify(item.timestamps) : (item.timestamps || null)),
            item.time_signature || '4/4',
            item.arrangementStyle || null,
            item.keyboardPatch || null,
            item.sheetMusicXml || null,
            userId,
            item.bandId || null,
            item.createdAt || now,
            now
          ]
        );
        return id;
      };
      try {
        if (Array.isArray(body)) {
          const ids = [];
          for (const item of body) {
            const id = await upsertOne(item);
            ids.push(id);
          }
          res.status(200).json({ ids });
        } else {
          const id = await upsertOne(body);
          res.status(201).json({ id });
        }
      } catch (err) {
        res.status(400).json({ error: err.message || 'Input tidak valid' });
      }
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/songs error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message, details: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
}