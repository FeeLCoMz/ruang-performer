/**
 * Router internal untuk songs — dipanggil oleh api/[...path].js.
 *
 * Menangani:
 *   POST /api/songs/bulk          → handleBulkSongs (modul Bulk Add Lirik & Chord)
 *   GET/PUT/PATCH /api/songs/:id/mastery → handleSongMastery
 *   GET/POST /api/songs           → daftar & tambah lagu
 *   GET/PUT/DELETE /api/songs/:id → diteruskan ke ./song-id.js
 */
import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { randomUUID } from 'crypto';
import songIdHandler from './song-id.js';
import { writeAuditLog, getRequestMeta } from '../_audit.js';

// Module-level flags: schema checks run only once per server instance
let _schemaEnsured = false;
let _schemaEnsurePromise = null;

const SONG_ID_METHODS = new Set(['GET', 'PUT', 'PATCH', 'DELETE']);

/**
 * Path asli request. Vercel rewrite tidak memindahkan query param seperti
 * ?id=...&path=mastery, jadi header x-original-url dipakai lebih dulu.
 */
const ORIGINAL_URL_HEADER = 'x-original-url';

function resolveRequestPath(req) {
  const forwarded = req.headers?.[ORIGINAL_URL_HEADER];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split('?')[0];
  return req.path || (req.url || '/').split('?')[0];
}

async function ensureSchema(client) {
  if (_schemaEnsured) return;
  if (!_schemaEnsurePromise) {
    _schemaEnsurePromise = (async () => {
      await ensureSongsColumns(client);
      await ensureSongMasteryTable(client);
      await ensureBandSongPracticeStatsTable(client);
      _schemaEnsured = true;
    })();
  }
  await _schemaEnsurePromise;
}

export async function readJson(req) {
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

async function ensureSongsColumns(client) {
  const columnsResult = await client.execute(`PRAGMA table_info(songs)`);
  const columns = (columnsResult.rows || []).map((row) => row.name);
  const extraColumns = {
    userId: 'TEXT',
    bandId: 'TEXT',
    time_signature: 'TEXT',
    arrangement_style: 'TEXT',
    keyboard_patch: 'TEXT',
    sheet_music_xml: 'TEXT',
  };
  for (const [name, type] of Object.entries(extraColumns)) {
    if (!columns.includes(name)) {
      // eslint-disable-next-line no-await-in-loop
      await client.execute(`ALTER TABLE songs ADD COLUMN ${name} ${type}`);
    }
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
    )`,
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_song_user_mastery_songId ON song_user_mastery(songId)`,
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_song_user_mastery_userId ON song_user_mastery(userId)`,
  );

  // Backfill from legacy table if it exists, so previous marks are preserved.
  const legacyTable = await client.execute(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'song_member_mastery' LIMIT 1`,
  );
  if (legacyTable.rows?.length) {
    await client.execute(
      `INSERT OR IGNORE INTO song_user_mastery (id, songId, userId, mastered, masteredAt, createdAt, updatedAt)
       SELECT id, songId, userId, mastered, masteredAt, createdAt, updatedAt
       FROM song_member_mastery`,
    );
  }
}

function toMasteryRows(rows) {
  // Status dari field `mastered`: 1 = Dikuasai ('mastered'), 0 = Perlu Latihan
  // ('learning'). 'Belum Diulik' = baris tidak ada.
  return (rows?.rows || []).map((row) => ({
    userId: row.userId,
    username: row.username || '-',
    masteredAt: row.masteredAt || row.updatedAt || row.createdAt || null,
    status: Number(row.mastered) === 1 ? 'mastered' : 'learning',
  }));
}

/** Daftar status penguasaan untuk satu lagu (termasuk baris mastered=0). */
async function getSongMasteryList(client, songId) {
  const rows = await client.execute(
    `SELECT sm.userId, sm.mastered, sm.masteredAt, sm.updatedAt, sm.createdAt, u.username
     FROM song_user_mastery sm
     LEFT JOIN users u ON u.id = sm.userId
     WHERE sm.songId = ?
     ORDER BY datetime(COALESCE(sm.masteredAt, sm.updatedAt, sm.createdAt)) DESC`,
    [songId],
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
    [bandId],
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

async function fetchYouTubeTrending() {
  const apiKey = process.env.VITE_YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,statistics');
    url.searchParams.set('chart', 'mostPopular');
    url.searchParams.set('maxResults', '12');
    url.searchParams.set('videoCategoryId', '10');
    url.searchParams.set('regionCode', 'ID');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || response.statusText);
    }

    const data = await response.json();
    return (data.items || []).map((item) => {
      const snippet = item.snippet || {};
      const thumbnails = snippet.thumbnails || {};
      const thumbnail = thumbnails.high || thumbnails.medium || thumbnails.default || {};
      return {
        videoId: item.id,
        title: snippet.title || '',
        channelTitle: snippet.channelTitle || '',
        publishedAt: snippet.publishedAt || '',
        viewCount: item.statistics?.viewCount || null,
        thumbnailUrl: thumbnail.url || '',
        description: snippet.description || '',
      };
    });
  } catch (error) {
    console.error('YouTube trending error:', error);
    return null;
  }
}

async function handleSongMastery(req, res, client, songId) {
  const userId = req.user?.userId || req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const songResult = await client.execute(
    `SELECT id, bandId FROM songs WHERE id = ? LIMIT 1`,
    [songId],
  );
  const song = songResult.rows?.[0];
  if (!song) {
    res.status(404).json({ error: 'Song not found' });
    return;
  }

  // Mastery marker harus anggota band aktif dari lagu band; untuk lagu pribadi
  // hanya pemilik lagu yang boleh menandai.
  if (song.bandId) {
    const bandMembers = await getActiveBandMemberSet(client, song.bandId);
    if (!bandMembers.has(String(userId))) {
      res.status(403).json({ error: 'Hanya anggota band yang bisa menandai status penguasaan' });
      return;
    }
  } else {
    const ownerRow = await client.execute(
      `SELECT userId FROM songs WHERE id = ? LIMIT 1`,
      [songId],
    );
    const ownerId = ownerRow.rows?.[0]?.userId;
    if (ownerId && String(ownerId) !== String(userId)) {
      res.status(403).json({ error: 'Hanya pemilik lagu yang bisa menandai status penguasaan' });
      return;
    }
  }

  if (req.method === 'GET') {
    const masteryAll = await getSongMasteryList(client, songId);
    const masteredBy = await filterMasteryForViewer(client, song.bandId || null, masteryAll, userId);
    const ownEntry = masteryAll.find((entry) => String(entry.userId) === String(userId));
    res.status(200).json({
      songId,
      masteredBy,
      isMasteredByCurrentUser: ownEntry?.status === 'mastered',
      currentUserStatus: ownEntry?.status || 'none',
    });
    return;
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const body = await readJson(req);
    // Status penguasaan disimpan di field `mastered` (skema tabel tidak diubah):
    //   1 = Dikuasai, 0 = Perlu Latihan, dan 'none' (Belum Diulik) = hapus baris.
    const requestedStatus = String(body?.status || '').toLowerCase();
    const masteredValue = requestedStatus === 'learning' ? 0 : 1;

    if (requestedStatus !== 'none') {
      const now = new Date().toISOString();
      await client.execute(
        `INSERT INTO song_user_mastery (id, songId, userId, mastered, masteredAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(songId, userId) DO UPDATE SET
           mastered = excluded.mastered,
           masteredAt = excluded.masteredAt,
           updatedAt = excluded.updatedAt`,
        [randomUUID(), songId, userId, masteredValue,
          requestedStatus === 'learning' ? null : now, now, now],
      );
    } else {
      await client.execute(
        `DELETE FROM song_user_mastery WHERE songId = ? AND userId = ?`,
        [songId, userId],
      );
    }

    const masteryAll = await getSongMasteryList(client, songId);
    const masteredBy = await filterMasteryForViewer(client, song.bandId || null, masteryAll, userId);
    const ownEntry = masteryAll.find((entry) => String(entry.userId) === String(userId));
    res.status(200).json({
      songId,
      mastered: masteredValue === 1,
      status: ownEntry?.status || 'none',
      masteredBy,
      isMasteredByCurrentUser: ownEntry?.status === 'mastered',
      currentUserStatus: ownEntry?.status || 'none',
    });
    return;
  }

  res.setHeader('Allow', 'GET, PUT, PATCH');
  res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req, res) {
  try {
    // Verify JWT token first
    if (!verifyToken(req, res)) return;

    const path = resolveRequestPath(req);
    const relativePath = path.replace(/^\/api\/songs\/?/, '').replace(/^\//, '');
    const pathSegments = relativePath ? relativePath.split('/').filter(Boolean) : [];
    const rewrittenMasterySongId = req.query?.id || req.query?.songId;
    const rewrittenPathMarker = req.query?.path || req.query?.endpoint;

    if (pathSegments.length === 2 && pathSegments[1] === 'mastery') {
      const client = getTursoClient();
      await ensureSchema(client);
      return handleSongMastery(req, res, client, pathSegments[0]);
    }

    // Bulk add (modul Bulk Add Lirik & Chord).
    if (pathSegments.length === 1 && pathSegments[0] === 'bulk' && req.method === 'POST') {
      return handleBulkSongs(req, res);
    }

    if (rewrittenMasterySongId && rewrittenPathMarker === 'mastery') {
      const client = getTursoClient();
      await ensureSchema(client);
      return handleSongMastery(req, res, client, rewrittenMasterySongId);
    }

    if (relativePath && SONG_ID_METHODS.has(req.method)) {
      // Delegate to ./song-id.js handler
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
      )`,
    );
    await ensureSchema(client);

    if (req.method === 'GET') {
      const userId = req.user?.userId || req.user?.id;
      const viewerId = String(userId || '');
      const requestedBandId = req.query?.bandId ? String(req.query.bandId) : null;
      const includeTrending = String(req.query?.include || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .includes('trending');

      if (requestedBandId) {
        const membership = await client.execute(
          `SELECT 1 FROM band_members
           WHERE bandId = ? AND userId = ?
             AND (status IS NULL OR lower(status) IN ('active', 'accepted', 'member'))
           LIMIT 1`,
          [requestedBandId, viewerId],
        );
        if (!membership.rows?.length) {
          res.status(403).json({ error: 'Forbidden - band access required' });
          return;
        }
      }

      // Join ke tabel users untuk ambil nama kontributor
      let songsQuery = `SELECT songs.id,
                songs.title,
                songs.artist,
                songs.youtubeId,
                songs.lyrics,
                songs.key,
                songs.tempo,
                songs.genre,
                songs.time_markers,
                songs.time_signature,
                songs.arrangement_style,
                songs.keyboard_patch,
                songs.userId,
                songs.bandId,
                songs.createdAt,
                songs.updatedAt,
                songs.sheet_music_xml,
                users.username AS contributorUsername,
                bands.name AS bandName,
                bps.sessionCount AS practiceSessionCount,
                bps.practicedCount AS practiceMarkedCount,
                bps.ratingAvg AS practiceRatingAvg,
                bps.lastPracticedAt AS lastPracticedAt,
                bps.lastRating AS lastPracticeRating
         FROM songs
         LEFT JOIN users ON users.id = songs.userId
         LEFT JOIN bands ON bands.id = songs.bandId
         LEFT JOIN band_song_practice_stats bps
           ON bps.songId = songs.id
          AND bps.bandId = songs.bandId`;
      const songQueryParams = [];
      if (requestedBandId) {
        songsQuery += ` WHERE songs.bandId = ?`;
        songQueryParams.push(requestedBandId);
      }
      songsQuery += ` ORDER BY (songs.updatedAt IS NULL) ASC, datetime(songs.updatedAt) DESC, datetime(songs.createdAt) DESC`;
      const rows = await client.execute(songsQuery, songQueryParams);

      const masteryRows = await client.execute(
        `SELECT sm.songId, sm.userId, sm.mastered, sm.masteredAt, sm.updatedAt, sm.createdAt, u.username
         FROM song_user_mastery sm
         LEFT JOIN users u ON u.id = sm.userId`,
      );
      const masteryMap = {};
      for (const row of masteryRows.rows || []) {
        if (!masteryMap[row.songId]) masteryMap[row.songId] = [];
        masteryMap[row.songId].push({
          userId: row.userId,
          username: row.username || '-',
          masteredAt: row.masteredAt || row.updatedAt || row.createdAt || null,
          status: Number(row.mastered) === 1 ? 'mastered' : 'learning',
        });
      }

      const songBandIds = Array.from(new Set(
        (rows.rows || [])
          .map((row) => row.bandId)
          .filter((bandId) => bandId)
          .map((bandId) => String(bandId)),
      ));

      const viewerBandsRows = await client.execute(
        `SELECT bandId FROM band_members
         WHERE userId = ?
           AND (
             status IS NULL
             OR lower(status) IN ('active', 'accepted', 'member')
           )`,
        [viewerId],
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
          songBandIds,
        );

        for (const member of membersRows.rows || []) {
          const bandKey = String(member.bandId);
          if (!bandMemberMap[bandKey]) bandMemberMap[bandKey] = new Set();
          bandMemberMap[bandKey].add(String(member.userId));
        }
      }

      const list = (rows.rows ?? []).map((row) => {
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
          ...row,
          masteredBy: visibleMasteredBy,
          isMasteredByCurrentUser: visibleMasteredBy.some(
            (entry) => String(entry.userId) === viewerId && entry.status === 'mastered',
          ),
          currentUserStatus:
            visibleMasteredBy.find((entry) => String(entry.userId) === viewerId)?.status || 'none',
          contributorName: row.contributorUsername, // alias agar frontend tetap pakai contributorName
          time_markers: row.time_markers ? JSON.parse(row.time_markers) : [],
          sheetMusicXml: row.sheet_music_xml || '',
          // The editor reads camelCase. Without these the fields came back
          // undefined, so reopening a song showed them empty and the next save
          // wrote that emptiness back over the stored value.
          arrangementStyle: row.arrangement_style || '',
          keyboardPatch: row.keyboard_patch || '',
          canMarkMastery: true,
          practiceStats: {
            sessionCount: Number(row.practiceSessionCount || 0),
            markedCount: Number(row.practiceMarkedCount || 0),
            ratingAvg: row.practiceRatingAvg == null ? null : Number(row.practiceRatingAvg),
            lastPracticedAt: row.lastPracticedAt || null,
            lastRating: row.lastPracticeRating == null ? null : Number(row.lastPracticeRating),
          },
        };
      });
      if (includeTrending) {
        const trending = await fetchYouTubeTrending();
        res.status(200).json({ songs: list, trending: trending || [] });
        return;
      }

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
            // The client sends `time_markers` (the same key the PUT handler reads).
            Array.isArray(item.time_markers)
              ? JSON.stringify(item.time_markers)
              : (item.time_markers || null),
            item.time_signature || '4/4',
            item.arrangementStyle || null,
            item.keyboardPatch || null,
            item.sheetMusicXml || null,
            userId,
            item.bandId || null,
            item.createdAt || now,
            now,
          ],
        );
        return id;
      };
      try {
        if (Array.isArray(body)) {
          const ids = [];
          for (const item of body) {
            // eslint-disable-next-line no-await-in-loop
            const id = await upsertOne(item);
            ids.push(id);
          }
          res.status(200).json({ ids });
        } else {
          const id = await upsertOne(body);
          const { ipAddress, userAgent } = getRequestMeta(req);
          await writeAuditLog(client, {
            action: 'SONG_CREATED',
            userId,
            bandId: body?.bandId || null,
            resourceId: id,
            resourceType: 'song',
            description: `Lagu dibuat: ${sanitize(body?.title, 100)}`,
            ipAddress,
            userAgent,
          });
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
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}

/* --------------------------------------------------------------------------
 * Bulk add (modul Bulk Add Lirik & Chord)
 * ------------------------------------------------------------------------ */

const BULK_MAX_SONGS = 1000;
/** Chunk insert: 50 lagu per putaran supaya tidak kena batas waktu function. */
const BULK_CHUNK_SIZE = 50;

function sanitizeBulkText(value, maxLen = 100) {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>"'`]/g, '').slice(0, maxLen);
}

function normalizeBulkTempo(value) {
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
    [bandId, String(userId)],
  );
  return Boolean(membership.rows?.length);
}

async function handleBulkSongs(req, res) {
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
  if (songs.length > BULK_MAX_SONGS) {
    res.status(400).json({ error: `Maksimal ${BULK_MAX_SONGS} lagu per proses bulk` });
    return;
  }

  const client = getTursoClient();
  await ensureSchema(client);

  // ---- Validasi menyeluruh dulu -----------------------------------------
  const failures = [];
  const prepared = songs.map((item, index) => {
    const source = item && typeof item === 'object' ? item : {};
    // Judul hanya dirapikan spasinya: karakter `"`, `<`, `'` adalah bagian dari
    // judul lagu yang wajar (mis. "Don't Stop"), jadi TIDAK disanitasi — dulu
    // sanitasi bisa mengosongkan judul terisi sehingga simpan gagal dengan
    // "Judul lagu wajib diisi".
    const rawTitle = typeof source.title === 'string' ? source.title.trim() : '';
    const title = rawTitle.replace(/\s+/g, ' ').slice(0, 200);
    if (!title) failures.push({ index, title: '', error: 'Judul lagu wajib diisi' });
    return {
      index,
      title,
      // Judul asli untuk pesan error (sebelum normalisasi).
      displayTitle: rawTitle.slice(0, 100),
      artist: sanitizeBulkText(source.artist, 100),
      genre: sanitizeBulkText(source.genre, 50),
      key: sanitizeBulkText(source.key, 20),
      youtubeId: sanitizeBulkText(source.youtubeId, 60),
      // Lirik & chord TIDAK disanitasi: karakter < > " ' ` bagian dari chord.
      lyrics: typeof source.lyrics === 'string' ? source.lyrics.slice(0, 50000) : '',
      tempo: normalizeBulkTempo(source.tempo),
      timeSignature: sanitizeBulkText(source.time_signature || source.timeSignature, 10) || '4/4',
      keyboardPatch: sanitizeBulkText(source.keyboardPatch, 200),
      sheetMusicXml: typeof source.sheetMusicXml === 'string' ? source.sheetMusicXml : null,
      bandId: source.bandId ? String(source.bandId) : null,
    };
  });

  if (failures.length > 0) {
    const firstFailure = failures[0];
    const firstTitle = prepared[firstFailure.index]?.displayTitle || `lagu #${firstFailure.index + 1}`;
    res.status(400).json({
      error:
        failures.length === 1
          ? `Lagu "${firstTitle}": ${firstFailure.error.toLowerCase()}`
          : `${failures.length} lagu belum valid (pertama: "${firstTitle}") — perbaiki dulu sebelum menyimpan.`,
      failures: failures.map((failure) => ({ ...failure, blockNumber: failure.index + 1 })),
    });
    return;
  }

  // Izin tulis per band (biasanya satu band yang sama, jadi di-cache).
  const bandAccess = new Map();
  for (const item of prepared) {
    if (!item.bandId) continue;
    if (!bandAccess.has(item.bandId)) {
      bandAccess.set(item.bandId, await assertBandWriteAccess(client, item.bandId, userId));
    }
    if (!bandAccess.get(item.bandId)) {
      res.status(403).json({ error: `Anda bukan anggota aktif band untuk lagu "${item.title}"` });
      return;
    }
  }

  // ---- Simpan ------------------------------------------------------------
  const now = new Date().toISOString();
  const insertSql = `INSERT INTO songs
      (id, title, artist, youtubeId, lyrics, key, tempo, genre, time_markers,
       time_signature, arrangement_style, keyboard_patch, sheet_music_xml,
       userId, bandId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const createdIds = [];
  try {
    for (let offset = 0; offset < prepared.length; offset += BULK_CHUNK_SIZE) {
      const chunk = prepared.slice(offset, offset + BULK_CHUNK_SIZE);
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
    for (let offset = 0; offset < createdIds.length; offset += 100) {
      const ids = createdIds.slice(offset, offset + 100);
      const placeholders = ids.map(() => '?').join(', ');
      // eslint-disable-next-line no-await-in-loop
      await client.execute(`DELETE FROM songs WHERE id IN (${placeholders})`, ids).catch(() => {});
    }
    throw error;
  }

  // Satu entri audit per batch — bukan per lagu — agar bulk 1000 lagu tidak
  // membanjiri tabel audit_logs.
  const { ipAddress, userAgent } = getRequestMeta(req);
  await writeAuditLog(client, {
    action: 'SONG_CREATED',
    userId,
    resourceType: 'song',
    description: `Bulk add: ${createdIds.length} lagu ditambahkan`,
    changes: { count: createdIds.length, source: 'bulk' },
    ipAddress,
    userAgent,
  });

  res.status(201).json({ ids: createdIds, created: createdIds.length });
}

async function ensureBandSongPracticeStatsTable(client) {
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
    )`,
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_band_song_practice_stats_band_song
     ON band_song_practice_stats(bandId, songId)`,
  );
}
