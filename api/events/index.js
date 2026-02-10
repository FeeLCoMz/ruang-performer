// Unified endpoint for gigs (konser) and practice (latihan)
import { getTursoClient } from '../_turso.js';
import { randomUUID } from 'crypto';
import { verifyToken } from '../_auth.js';

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

export default async function handler(req, res) {
  if (!verifyToken(req, res)) return;

  // Use Express params for route matching
  let type = req.params?.type;
  let id = req.params?.id || null;
  // Fallback: parse type from URL if not present (for Vercel)
  if (!type) {
    const match = req.url.match(/\/api\/events\/(gig|practice)(?:\/(\w+))?/);
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
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
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
            `SELECT ps.id, ps.bandId, ps.date, ps.duration, ps.songs, ps.notes, ps.createdAt, ps.updatedAt, b.name as bandName FROM practice_sessions ps LEFT JOIN bands b ON ps.bandId = b.id WHERE ps.id = ? AND ps.bandId IN (SELECT bandId FROM band_members WHERE userId = ?) LIMIT 1`,
            [id, userId]
          );
          const row = result.rows?.[0] || null;
          if (!row) return res.status(404).json({ error: 'Practice session not found' });
          res.status(200).json({ ...row, songs: (() => { try { return row.songs ? JSON.parse(row.songs) : []; } catch { return []; } })() });
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
          const songsJson = JSON.stringify(body.songs || []);
          const result = await client.execute(`UPDATE practice_sessions SET date = COALESCE(?, date), duration = COALESCE(?, duration), songs = COALESCE(?, songs), notes = COALESCE(?, notes), updatedAt = ? WHERE id = ? AND bandId IN (SELECT bandId FROM band_members WHERE userId = ?)`, [body.date, body.duration, songsJson, body.notes, now, id, userId]);
          if (result.rowsAffected === 0) return res.status(404).json({ error: 'Practice session not found or no permission' });
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
          const result = await client.execute(`DELETE FROM practice_sessions WHERE id = ? AND bandId IN (SELECT bandId FROM band_members WHERE userId = ?)`, [id, userId]);
          if (result.rowsAffected === 0) return res.status(404).json({ error: 'Practice session not found or no permission' });
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
        let query = `SELECT g.id, g.bandId, g.date, g.venue, g.city, g.fee, g.setlistId, g.notes, g.createdAt, g.updatedAt, b.name as bandName FROM gigs g LEFT JOIN bands b ON g.bandId = b.id WHERE g.userId = ?`;
        const params = [userId];
        if (bandId) { query += ' AND g.bandId = ?'; params.push(bandId); }
        query += ' ORDER BY g.date DESC LIMIT 100';
        const result = await client.execute(query, params);
        res.status(200).json(result.rows || []);
        return;
      } else {
        let query = `SELECT ps.id, ps.bandId, ps.date, ps.duration, ps.songs, ps.notes, ps.createdAt, ps.updatedAt, b.name as bandName FROM practice_sessions ps LEFT JOIN bands b ON ps.bandId = b.id WHERE ps.bandId IN (SELECT bandId FROM band_members WHERE userId = ?)`;
        const params = [userId];
        if (bandId) { query += ' AND ps.bandId = ?'; params.push(bandId); }
        query += ' ORDER BY datetime(ps.date) DESC';
        const result = await client.execute(query, params);
        const sessions = (result.rows || []).map(row => ({ ...row, songs: (() => { try { return row.songs ? JSON.parse(row.songs) : []; } catch { return []; } })() }));
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
        if (!body.date) return res.status(400).json({ error: 'Date is required' });
        const id = randomUUID();
        const songsJson = JSON.stringify(body.songs || []);
        await client.execute(`INSERT INTO practice_sessions (id, bandId, userId, date, duration, songs, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, body.bandId || null, userId, body.date, body.duration || null, songsJson, body.notes || '', now, now]);
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
