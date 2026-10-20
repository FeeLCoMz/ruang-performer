/**
 * Uji audit untuk login yang diblokir rate limiter dan member join/left,
 * memakai SQLite in-memory + client Turso tiruan.
 *
 * Jalankan: node scripts/check-audit-auth.mjs
 */
import { DatabaseSync } from 'node:sqlite';
import { writeAuditLog, resolveActionSeverity } from '../server/_audit.js';
import { createRateLimiter, RATE_LIMITS } from '../server/middleware-rateLimiter.js';

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
};

function makeClient(db) {
  return {
    execute: async (statement) => {
      const sql = typeof statement === 'string' ? statement : statement.sql;
      const args = typeof statement === 'string' ? [] : (statement.args || []);
      const stmt = db.prepare(sql);
      if (/^\s*(select|pragma|with)/i.test(sql)) return { rows: stmt.all(...args) };
      stmt.run(...args);
      return { rows: [] };
    },
  };
}

// --- 1. Rate limiter menandai request yang diblokir ----------------------
{
  const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60_000 });
  const run = () => {
    const req = { headers: {}, url: '/api/auth/login' };
    const res = {
      headersSent: false,
      setHeader() {},
      status(code) { this.code = code; return this; },
      json(payload) { this.payload = payload; this.headersSent = true; return this; },
    };
    let allowed = false;
    limiter(req, res, () => { allowed = true; });
    return { req, res, allowed };
  };

  const first = run();
  const second = run();
  const third = run();

  assert(first.allowed === true && second.allowed === true, 'dua request pertama diizinkan');
  assert(third.allowed === false, 'request ketiga diblokir');
  assert(third.res.code === 429, 'respons 429 terkirim');
  assert(!!third.req.rateLimited, 'req.rateLimited terisi saat diblokir');
  assert(Number.isFinite(third.req.rateLimited.retryAfter), 'retryAfter berupa angka');
  assert(!first.req.rateLimited, 'request yang lolos tidak ditandai');
}

// --- 2. Entri audit untuk login diblokir --------------------------------
{
  const db = new DatabaseSync(':memory:');
  const client = makeClient(db);

  await writeAuditLog(client, {
    action: 'USER_LOGIN_BLOCKED',
    status: 'failed',
    description: 'Login diblokir rate limit (coba lagi 900 detik)',
    changes: { retryAfter: 900, limitKey: 'rate-limit:203.0.113.5' },
    errorMessage: 'Too many requests',
    ipAddress: '203.0.113.5',
    userAgent: 'Mozilla/5.0',
  });

  const [row] = db.prepare('SELECT * FROM audit_logs').all();
  assert(row.action === 'USER_LOGIN_BLOCKED', 'action USER_LOGIN_BLOCKED tersimpan');
  assert(row.status === 'failed', 'status failed');
  assert(row.severity === 'high', 'severity high');
  assert(row.category === 'USER', 'kategori USER');
  assert(row.ipAddress === '203.0.113.5', 'IP tercatat');
  assert(String(row.details).includes('"retryAfter":900'), 'retryAfter tersimpan di details');
  db.close();
}

// --- 3. Member join / left ----------------------------------------------
{
  const db = new DatabaseSync(':memory:');
  const client = makeClient(db);

  await writeAuditLog(client, {
    action: 'MEMBER_JOINED',
    userId: 'u9',
    targetUserId: 'u9',
    resourceId: 'u9',
    resourceType: 'user',
    description: 'Pendaftaran akun baru: ronz',
  });
  await writeAuditLog(client, {
    action: 'MEMBER_LEFT',
    userId: 'u9',
    bandId: 'b1',
    targetUserId: 'u9',
    resourceId: 'b1',
    resourceType: 'band_member',
    description: 'Anggota keluar dari band',
  });

  const rows = db.prepare('SELECT action, category, severity, bandId, userId FROM audit_logs ORDER BY createdAt').all();
  assert(rows.length === 2, 'dua entri member tersimpan');
  assert(rows[0].action === 'MEMBER_JOINED' && rows[0].category === 'MEMBER', 'MEMBER_JOINED kategori MEMBER');
  assert(rows[1].action === 'MEMBER_LEFT' && rows[1].bandId === 'b1', 'MEMBER_LEFT menyimpan bandId');
  assert(resolveActionSeverity('MEMBER_LEFT') === 'low', 'MEMBER_LEFT severity low');
  assert(resolveActionSeverity('MEMBER_JOINED') === 'high', 'MEMBER_JOINED severity high');
  db.close();
}

if (!process.exitCode) console.log('\nAUDIT AUTH CHECK OK');

// Rate limiter menyimpan timer internal yang menahan event loop; keluar eksplisit
// supaya `node script` tidak menggantung setelah semua assertion selesai.
process.exit(process.exitCode || 0);
