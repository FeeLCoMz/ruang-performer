import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { PERMISSIONS, hasPermission } from '../../src/utils/permissionUtils.js';

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
      client = getTursoClient();
    } catch (clientErr) {
      console.error(`[songs/[id]] Failed to get Turso client:`, clientErr.message);
      res.status(500).json({ error: 'Database connection error', details: clientErr.message });
      return;
    }
    // Tabel dan kolom sudah diatur lewat migrasi skema
    if (req.method === 'GET') {
      try {
        const result = await client.execute(
          `SELECT s.id, s.title, s.artist, s.youtubeId, s.lyrics, s.key, s.tempo, s.genre, s.capo, 
                  s.time_markers, s.arrangement_style, s.keyboard_patch, s.userId, s.bandId, s.createdAt, s.updatedAt,
                  s.sheet_music_xml, b.name as bandName, u.username as contributor
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
        res.status(200).json({
          ...row,
          time_markers: row.time_markers ? JSON.parse(row.time_markers) : [],
          arrangementStyle: row.arrangement_style || '',
          keyboardPatch: row.keyboard_patch || '',
          sheetMusicXml: row.sheet_music_xml || '',
        });
        return;
      } catch (queryErr) {
        throw queryErr;
      }
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await readJson(req);
      const now = new Date().toISOString();
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if song exists and get ownership/band info
      const songCheck = await client.execute(
        `SELECT s.userId, s.bandId
         FROM songs s
         WHERE s.id = ?`,
        [idStr]
      );
      if (!songCheck.rows || songCheck.rows.length === 0) {
        res.status(404).json({ error: 'Song not found' });
        return;
      }
      const song = songCheck.rows[0];
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
      // Permission constants
      const { SONG_EDIT } = PERMISSIONS;
      // Allow owner of the song to edit their own song
      if (isOwner) {
        // Owner can always edit their own song
        // (even if not band member or role is member)
      } else {
        // Only allow edit if user has SONG_EDIT permission for their role
        if (!hasPermission(userRole, SONG_EDIT)) {
          res.status(403).json({ error: 'You do not have permission to edit songs' });
          return;
        }
        // For band songs, must be band member
        if (isBandSong && !isBandMember) {
          res.status(403).json({ error: 'You can only edit band songs if you are a band member' });
          return;
        }
      }

      // DEBUG: log payload yang diterima

      // Only update timestamps if present in body
      let updateSql = `UPDATE songs SET 
        title = COALESCE(?, title),
        artist = COALESCE(?, artist),
        youtubeId = COALESCE(?, youtubeId),
        lyrics = COALESCE(?, lyrics),
        key = COALESCE(?, key),
        tempo = COALESCE(?, tempo),
        genre = COALESCE(?, genre),
        capo = COALESCE(?, capo),
        time_markers = COALESCE(?, time_markers),
        arrangement_style = COALESCE(?, arrangement_style),
        keyboard_patch = COALESCE(?, keyboard_patch),
        sheet_music_xml = COALESCE(?, sheet_music_xml),
        bandId = ?,
        updatedAt = ?`;
      // Pastikan tempo disimpan sebagai string integer tanpa koma
      let tempoStr = null;
      if (body.tempo !== undefined && body.tempo !== null && body.tempo !== '') {
        const tempoInt = parseInt(String(body.tempo).replace(/,/g, '.'), 10);
        if (!isNaN(tempoInt)) tempoStr = tempoInt.toString();
      }
      // Pastikan capo disimpan sebagai string integer
      let capoStr = null;
      if (body.capo !== undefined && body.capo !== null && body.capo !== '') {
        const capoInt = parseInt(String(body.capo), 10);
        if (!isNaN(capoInt)) capoStr = capoInt.toString();
      }
      let updateParams = [
        body.title ?? null,
        body.artist ?? null,
        body.youtubeId ?? null,
        body.lyrics ?? null,
        body.key ?? null,
        tempoStr,
        body.genre ?? null,
        capoStr,
        (Array.isArray(body.time_markers) ? JSON.stringify(body.time_markers) : (body.time_markers ?? null)),
        body.arrangementStyle ?? null,
        body.keyboardPatch ?? null,
        body.sheetMusicXml ?? null,
        body.bandId ?? null,
        now
      ];
      updateSql += ' WHERE id = ?';
      updateParams.push(idStr);

      const result = await client.execute(updateSql, updateParams);

      res.status(200).json({ id });
      return;
    }

    if (req.method === 'DELETE') {
      const userId = req.user?.userId;

      // Check if song exists and user is the creator
      const songCheck = await client.execute(
        'SELECT userId FROM songs WHERE id = ?',
        [idStr]
      );

      if (!songCheck.rows || songCheck.rows.length === 0) {
        res.status(404).json({ error: 'Song not found' });
        return;
      }

      if (songCheck.rows[0].userId !== userId) {
        res.status(403).json({ error: 'You can only delete your own songs' });
        return;
      }

      await client.execute(`DELETE FROM songs WHERE id = ?`, [idStr]);
      res.status(204).end();
      return;
    }

    res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/songs/[id] error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message, details: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
}