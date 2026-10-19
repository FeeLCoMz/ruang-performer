import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { PERMISSIONS, hasPermission } from '../../src/utils/permissionUtils.js';

// Module-level flags: schema checks run only once per server instance
let _schemaEnsured = false;
let _schemaEnsurePromise = null;

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

  if (!songBandId) {
    return masteryList.filter((entry) => String(entry.userId) === normalizedViewerId);
  }

  const bandMembers = await getActiveBandMemberSet(client, songBandId);
  const isViewerInBand = bandMembers.has(normalizedViewerId);
  if (!isViewerInBand) {
    return masteryList.filter((entry) => String(entry.userId) === normalizedViewerId);
  }

  return masteryList.filter((entry) => {
    const entryUserId = String(entry.userId || '');
    return bandMembers.has(entryUserId) || entryUserId === normalizedViewerId;
  });
}

/**
 * Load a song row (id, ownership, band) or send 404 and return null.
 */
async function loadSongWithOwnership(client, idStr, res) {
  const songCheck = await client.execute(
    'SELECT userId, bandId FROM songs WHERE id = ?',
    [idStr]
  );
  if (!songCheck.rows || songCheck.rows.length === 0) {
    res.status(404).json({ error: 'Song not found' });
    return null;
  }
  return songCheck.rows[0];
}

async function handleGetSong(req, res, client, idStr) {
  const result = await client.execute(
      `SELECT s.id, s.title, s.artist, s.youtubeId, s.lyrics, s.key, s.tempo, s.genre,
            s.time_markers, s.arrangement_style, s.keyboard_patch, s.userId, s.bandId, s.createdAt, s.updatedAt,
          s.sheet_music_xml, s.time_signature, b.name as bandName, u.username as contributor
       FROM songs s
       LEFT JOIN bands b ON s.bandId = b.id
       LEFT JOIN users u ON s.userId = u.id
       WHERE s.id = ? LIMIT 1`,
    [idStr]
  );
  const row = result.rows?.[0] || null;
  if (!row) {
    res.status(404).json({ error: 'Song not found' });
    return;
  }

  const userId = req.user?.userId;
  const masteredRows = await client.execute(
    `SELECT sm.userId, sm.mastered, sm.masteredAt, sm.updatedAt, sm.createdAt, u.username
     FROM song_user_mastery sm
     LEFT JOIN users u ON u.id = sm.userId
     WHERE sm.songId = ?
     ORDER BY datetime(COALESCE(sm.masteredAt, sm.updatedAt, sm.createdAt)) DESC`,
    [idStr]
  );
  const masteredBy = (masteredRows.rows || []).map((entry) => ({
    userId: entry.userId,
    username: entry.username || '-',
    masteredAt: entry.masteredAt || entry.updatedAt || entry.createdAt || null,
    status: Number(entry.mastered) === 1 ? 'mastered' : 'learning',
  }));

  const visibleMasteredBy = await filterMasteryForViewer(client, row.bandId || null, masteredBy, userId);
  const canMarkMastery = Boolean(userId);
  const ownMasteryEntry = masteredBy.find((entry) => String(entry.userId) === String(userId));

  res.status(200).json({
    ...row,
    time_markers: row.time_markers ? JSON.parse(row.time_markers) : [],
    arrangementStyle: row.arrangement_style || '',
    keyboardPatch: row.keyboard_patch || '',
    sheetMusicXml: row.sheet_music_xml || '',
    masteredBy: visibleMasteredBy,
    canMarkMastery,
    isMasteredByCurrentUser: ownMasteryEntry?.status === 'mastered',
    currentUserStatus: ownMasteryEntry?.status || 'none',
  });
}

async function handleUpdateSong(req, res, client, idStr) {
  const body = await readJson(req);
  const now = new Date().toISOString();
  const userId = req.user?.userId;
  const userRole = req.user?.role;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const song = await loadSongWithOwnership(client, idStr, res);
  if (!song) return;

  const isOwner = song.userId && song.userId === userId;
  const isBandSong = !!song.bandId;
  let isBandMember = false;
  if (isBandSong) {
    const memberCheck = await client.execute(
      `SELECT 1 FROM band_members WHERE bandId = ? AND userId = ? LIMIT 1`,
      [song.bandId, userId]
    );
    isBandMember = memberCheck.rows && memberCheck.rows.length > 0;
  }
  // Owner can always edit their own song; otherwise require SONG_EDIT
  // permission, plus band membership for band songs.
  if (!isOwner) {
    if (!hasPermission(userRole, PERMISSIONS.SONG_EDIT)) {
      res.status(403).json({ error: 'You do not have permission to edit songs' });
      return;
    }
    if (isBandSong && !isBandMember) {
      res.status(403).json({ error: 'You can only edit band songs if you are a band member' });
      return;
    }
  }

  const updateSql = `UPDATE songs SET
    title = COALESCE(?, title),
    artist = COALESCE(?, artist),
    youtubeId = COALESCE(?, youtubeId),
    lyrics = COALESCE(?, lyrics),
    key = COALESCE(?, key),
    tempo = COALESCE(?, tempo),
    genre = COALESCE(?, genre),
    time_markers = COALESCE(?, time_markers),
    time_signature = COALESCE(?, time_signature),
    arrangement_style = COALESCE(?, arrangement_style),
    keyboard_patch = COALESCE(?, keyboard_patch),
    sheet_music_xml = COALESCE(?, sheet_music_xml),
    bandId = COALESCE(?, bandId),
    updatedAt = ? WHERE id = ?`;
  // Pastikan tempo disimpan sebagai string integer tanpa koma
  let tempoStr = null;
  if (body.tempo !== undefined && body.tempo !== null && body.tempo !== '') {
    const tempoInt = parseInt(String(body.tempo).replace(/,/g, '.'), 10);
    if (!isNaN(tempoInt)) tempoStr = tempoInt.toString();
  }
  const updateParams = [
    body.title ?? null,
    body.artist ?? null,
    body.youtubeId ?? null,
    body.lyrics ?? null,
    body.key ?? null,
    tempoStr,
    body.genre ?? null,
    (Array.isArray(body.time_markers) ? JSON.stringify(body.time_markers) : (body.time_markers ?? null)),
    body.time_signature ?? null,
    body.arrangementStyle ?? null,
    body.keyboardPatch ?? null,
    body.sheetMusicXml ?? null,
    body.bandId ?? null,
    now,
    idStr
  ];

  await client.execute(updateSql, updateParams);

  res.status(200).json({ id: idStr });
}

async function handleDeleteSong(req, res, client, idStr) {
  const userId = req.user?.userId;

  const song = await loadSongWithOwnership(client, idStr, res);
  if (!song) return;

  const isOwner = song.userId && song.userId === userId;

  if (!isOwner) {
    // Bukan owner: hanya anggota band aktif dengan permission edit lagu
    // yang boleh menghapus lagu milik band.
    let canDelete = false;
    if (song.bandId && userId) {
      const memberCheck = await client.execute(
        `SELECT role FROM band_members
         WHERE bandId = ? AND userId = ?
           AND (status IS NULL OR lower(status) IN ('active', 'accepted', 'member'))
         LIMIT 1`,
        [song.bandId, userId]
      );
      const memberRole = memberCheck.rows?.[0]?.role || req.user?.role || 'member';
      canDelete = hasPermission(memberRole, PERMISSIONS.SONG_EDIT);
    }
    if (!canDelete) {
      res.status(403).json({ error: 'Anda hanya bisa menghapus lagu milik sendiri, atau lagu band dengan izin edit' });
      return;
    }
  }

  await client.execute(`DELETE FROM songs WHERE id = ?`, [idStr]);
  res.status(204).end();
}

// Thin method dispatcher: auth + client setup happen here, then each HTTP
// method is handled by its own function.
export default async function handler(req, res) {
  // Support both Express (req.params) and Vercel/Next.js (req.query)
  let id = (req.query && req.query.id) || (req.params && req.params.id) || '';
  if (Array.isArray(id)) id = id[0];
  const idStr = id ? String(id).trim() : '';
  if (!idStr) {
    res.status(400).json({ error: 'Missing song id' });
    return;
  }

  try {
    // Verify JWT token first
    if (!verifyToken(req, res)) {
      return;
    }

    let client;
    try {
      client = getTursoClient(req);
      if (!_schemaEnsured) {
        if (!_schemaEnsurePromise) {
          _schemaEnsurePromise = (async () => {
            await ensureSongsColumns(client);
            await ensureSongMasteryTable(client);
            _schemaEnsured = true;
          })();
        }
        await _schemaEnsurePromise;
      }
    } catch (clientErr) {
      console.error(`[songs/[id]] Failed to get Turso client:`, clientErr.message);
      res.status(500).json({ error: 'Database connection error', details: clientErr.message });
      return;
    }
    if (req.method === 'GET') {
      await handleGetSong(req, res, client, idStr);
      return;
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      await handleUpdateSong(req, res, client, idStr);
      return;
    }

    if (req.method === 'DELETE') {
      await handleDeleteSong(req, res, client, idStr);
      return;
    }

    res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/songs/[id] error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message, details: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
}