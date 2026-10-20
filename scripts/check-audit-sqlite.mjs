/**
 * Uji end-to-end penulisan & pembacaan audit log terhadap SQLite in-memory
 * (node:sqlite). Memastikan:
 *   1. ensureAuditLogTable membuat tabel yang belum ada,
 *   2. writeAuditLog berhasil setelah tabel dibuat,
 *   3. kolom yang hilang pada tabel versi lama ditambahkan (ALTER TABLE),
 *   4. query JOIN di handler audit-logs valid.
 *
 * Jalankan: node scripts/check-audit-sqlite.mjs
 */
import { DatabaseSync } from 'node:sqlite';
import { ensureAuditLogTable, writeAuditLog, resolveActionCategory } from '../server/_audit.js';

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
};

/** Turso-like client di atas node:sqlite. */
function makeClient(db) {
  return {
    execute: async (statement) => {
      const sql = typeof statement === 'string' ? statement : statement.sql;
      const args = typeof statement === 'string' ? [] : (statement.args || []);
      const stmt = db.prepare(sql);
      if (/^\s*(select|pragma|with)/i.test(sql)) {
        return { rows: stmt.all(...args), columns: [] };
      }
      stmt.run(...args);
      return { rows: [], columns: [] };
    },
  };
}

// --- 1. Database kosong ------------------------------------------------
{
  const db = new DatabaseSync(':memory:');
  const client = makeClient(db);

  const ready = await ensureAuditLogTable(client);
  assert(ready === true, 'ensureAuditLogTable membuat tabel di DB kosong');

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  assert(tables.some((t) => t.name === 'audit_logs'), 'tabel audit_logs ada');

  const written = await writeAuditLog(client, {
    action: 'SONG_CREATED',
    userId: 'u1',
    bandId: 'b1',
    resourceId: 's1',
    resourceType: 'song',
    description: 'Lagu dibuat: Uji',
  });
  assert(written === true, 'writeAuditLog berhasil setelah tabel dibuat');

  const rows = db.prepare('SELECT * FROM audit_logs').all();
  assert(rows.length === 1, 'satu baris audit tersimpan');
  assert(rows[0].action === 'SONG_CREATED', 'action benar');
  assert(rows[0].category === 'SONG', 'category benar');
  assert(rows[0].severity === 'low', 'severity benar');
  assert(rows[0].status === 'success', 'status benar');
  assert(rows[0].bandId === 'b1', 'bandId tersimpan');
  assert(String(rows[0].details).includes('s1'), 'details memuat resourceId');

  // Query yang dipakai handler /api/audit-logs harus valid.
  db.prepare('CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT)').run();
  db.prepare("INSERT INTO users (id, username) VALUES ('u1', 'ronz')").run();
  const joined = db.prepare(`
    SELECT al.id, al.action, u.username
    FROM audit_logs al LEFT JOIN users u ON u.id = al.userId
    ORDER BY al.createdAt DESC LIMIT 200
  `).all();
  assert(joined.length === 1 && joined[0].username === 'ronz', 'query JOIN handler valid');
  db.close();
}

// --- 2. Tabel versi lama (kolom minim) -----------------------------------
{
  const db = new DatabaseSync(':memory:');
  // Skema awal seperti dipakai auth-reset-password.js sebelum perubahan.
  db.prepare(`CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    userId TEXT,
    action TEXT,
    category TEXT,
    severity TEXT,
    status TEXT,
    createdAt TEXT
  )`).run();
  db.prepare(`INSERT INTO audit_logs (id, userId, action, createdAt)
              VALUES ('old', 'u0', 'USER_PASSWORD_RESET', '2026-01-01')`).run();

  // Reset cache modul supaya ensureAuditLogTable jalan kembali.
  const client = makeClient(db);
  const ready = await ensureAuditLogTable(client);
  assert(ready === true, 'ensure berhasil pada tabel versi lama');

  const columns = db.prepare('PRAGMA table_info(audit_logs)').all().map((c) => c.name);
  for (const column of ['bandId', 'details', 'ipAddress', 'userAgent', 'resourceId', 'resourceType', 'targetUserId']) {
    assert(columns.includes(column), `kolom ${column} ditambahkan`);
  }

  const written = await writeAuditLog(client, {
    action: 'BAND_DELETED',
    userId: 'u1',
    bandId: 'b9',
    ipAddress: '1.2.3.4',
  });
  assert(written === true, 'writeAuditLog berhasil pada tabel versi lama');

  const rows = db.prepare('SELECT * FROM audit_logs ORDER BY createdAt DESC').all();
  assert(rows.length === 2, 'baris lama tetap ada + baris baru');
  assert(rows[0].action === 'BAND_DELETED' && rows[0].severity === 'critical', 'entri baru tersimpan');
  db.close();
}

// --- 3. Kategori tetap konsisten ----------------------------------------
assert(resolveActionCategory('USER_DELETED') === 'USER', 'kategori USER_DELETED');
assert(resolveActionCategory('USER_LOGIN_FAILED') === 'USER', 'kategori USER_LOGIN_FAILED');

// --- 4. Login gagal & logout tercatat -----------------------------------
{
  const db = new DatabaseSync(':memory:');
  const client = makeClient(db);

  await writeAuditLog(client, {
    action: 'USER_LOGIN_FAILED',
    status: 'failed',
    errorMessage: 'Password salah',
    description: 'Login gagal: password salah (ronz)',
    ipAddress: '198.51.100.7',
    userAgent: 'Mozilla/5.0',
  });
  await writeAuditLog(client, {
    action: 'USER_LOGIN',
    userId: 'u1',
    description: 'Login berhasil: ronz',
  });
  await writeAuditLog(client, {
    action: 'USER_LOGOUT',
    userId: 'u1',
    description: 'Logout',
  });

  const rows = db.prepare('SELECT action, severity, status, details, ipAddress FROM audit_logs ORDER BY createdAt').all();
  assert(rows.length === 3, 'tiga entri auth tersimpan');
  assert(rows.some((r) => r.action === 'USER_LOGIN'), 'USER_LOGIN tercatat');
  assert(rows.some((r) => r.action === 'USER_LOGOUT'), 'USER_LOGOUT tercatat');

  const failed = rows.find((r) => r.action === 'USER_LOGIN_FAILED');
  assert(failed?.status === 'failed', 'login gagal berstatus failed');
  assert(failed?.severity === 'high', 'login gagal severity high');
  assert(String(failed?.details).includes('Password salah'), 'alasan gagal tersimpan');
  assert(failed?.ipAddress === '198.51.100.7', 'IP percobaan login tercatat');
  db.close();
}

if (!process.exitCode) console.log('\nAUDIT SQLITE CHECK OK');
