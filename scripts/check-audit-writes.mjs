/**
 * Uji cepat tulis audit: handler songs/setlists/bands/users dipanggil dengan
 * client Turso palsu yang merekam setiap query, lalu diperiksa apakah
 * INSERT INTO audit_logs muncul dengan action yang benar.
 *
 * Jalankan: node scripts/check-audit-writes.mjs
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const recorded = [];
function makeClient() {
  return {
    execute: async (statement) => {
      const sql = typeof statement === 'string' ? statement : statement.sql;
      const args = typeof statement === 'string' ? [] : statement.args || [];
      recorded.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), args });
      return { rows: [], columns: [] };
    },
    batch: async () => ({ results: [] }),
    close: () => {},
  };
}

// Semua handler memakai modul client yang sama; cukup stub getTursoClient.
void (await import('../server/_turso.js'));

const { writeAuditLog, getRequestMeta, resolveActionCategory, resolveActionSeverity } =
  await import('../server/_audit.js');

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
};

// --- 1. Helper dasar ------------------------------------------------------
assert(resolveActionCategory('MEMBER_ROLE_CHANGED') === 'PERMISSION', 'kategori MEMBER_ROLE_CHANGED = PERMISSION');
assert(resolveActionCategory('SONG_UPDATED') === 'SONG', 'kategori SONG_UPDATED');
assert(resolveActionSeverity('SONG_UPDATED') === 'medium', 'severity SONG_UPDATED = medium');
assert(resolveActionSeverity('BAND_DELETED') === 'critical', 'severity BAND_DELETED = critical');
assert(resolveActionSeverity('BAND_CREATED') === 'high', 'severity BAND_CREATED = high');
assert(resolveActionSeverity('SONG_CREATED') === 'low', 'severity SONG_CREATED = low');
assert(resolveActionSeverity('USER_LOGIN_FAILED') === 'high', 'severity USER_LOGIN_FAILED = high');
assert(resolveActionSeverity('USER_LOGIN') === 'low', 'severity USER_LOGIN = low');

const meta = getRequestMeta({
  headers: {
    'x-forwarded-for': '203.0.113.9, 10.0.0.1',
    'User-Agent': 'jest',
  },
});
assert(meta.ipAddress === '203.0.113.9', 'IP diambil dari x-forwarded-for');

// --- 2. Insert sukses -----------------------------------------------------
recorded.length = 0;
const okWrite = await writeAuditLog(makeClient(), {
  action: 'SONG_UPDATED',
  userId: 'u1',
  bandId: 'b1',
  resourceId: 's1',
  resourceType: 'song',
  changes: { title: 'Baru' },
});
assert(okWrite === true, 'writeAuditLog mengembalikan true');
const insert = recorded.find((r) => r.sql.startsWith('INSERT INTO audit_logs'));
assert(!!insert, 'INSERT INTO audit_logs dieksekusi');
assert(insert.args[2] === 'SONG_UPDATED', 'action tersimpan');
assert(insert.args[3] === 'SONG', 'category tersimpan');
assert(insert.args[4] === 'medium', 'severity tersimpan');
assert(insert.args[5] === 'success', 'status success');
assert(typeof insert.args[8] === 'string' && insert.args[8].includes('"title":"Baru"'), 'details JSON');
assert(
  typeof insert.args[8] === 'string' && insert.args[8].includes('"resourceId":"s1"'),
  'resourceId ikut tersimpan di details',
);

// --- 3. Insert gagal tidak melempar --------------------------------------
const failingClient = { execute: async () => { throw new Error('no such table: audit_logs'); } };
let threw = false;
let failedWrite = null;
try {
  failedWrite = await writeAuditLog(failingClient, { action: 'SONG_DELETED', userId: 'u1' });
} catch {
  threw = true;
}
assert(!threw, 'error audit tidak bocor ke request utama');
assert(failedWrite === false, 'writeAuditLog mengembalikan false saat gagal');

// --- 4. Tidak ada action = tidak ada query -------------------------------
recorded.length = 0;
const noAction = await writeAuditLog(makeClient(), { userId: 'u1' });
assert(noAction === false && recorded.length === 0, 'tanpa action tidak menulis apa pun');

// --- 5. Status gagal ------------------------------------------------------
recorded.length = 0;
await writeAuditLog(makeClient(), {
  action: 'USER_LOGIN_FAILED',
  status: 'failed',
  errorMessage: 'Password salah',
  ipAddress: '1.2.3.4',
});
const failedEntry = recorded.find((r) => r.sql.startsWith('INSERT INTO audit_logs'));
assert(failedEntry.args[5] === 'failed', 'status failed tersimpan');
assert(failedEntry.args[4] === 'high', 'severity USER_LOGIN_FAILED high');
assert(String(failedEntry.args[8]).includes('Password salah'), 'errorMessage masuk details');

const { getActionCategory, getActionSeverity } = await import('../src/utils/auditLogger.js');
assert(getActionCategory('MEMBER_ROLE_CHANGED') === 'PERMISSION', 'frontend: kategori role change selaras');
assert(getActionSeverity('USER_DELETED') === 'critical', 'frontend: USER_DELETED critical');

if (!process.exitCode) console.log('\nAUDIT WRITE CHECK OK');
