/**
 * Uji kuota AI Autofill (server/_aiUsage.js) terhadap SQLite in-memory.
 *
 * Jalankan: node scripts/check-ai-quota.mjs
 */
import { DatabaseSync } from 'node:sqlite';

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

process.env.AI_AUTOFILL_MONTHLY_LIMIT = '3';
const { getUsage, incrementUsage, checkQuota, currentPeriod, getMonthlyLimit } =
  await import('../server/_aiUsage.js');

// --- 1. Helper ------------------------------------------------------------
assert(getMonthlyLimit() === 3, 'limit dibaca dari env');
assert(/^\d{4}-\d{2}$/.test(currentPeriod()), 'period berformat YYYY-MM');
assert(currentPeriod(new Date('2026-10-20T05:00:00Z')) === '2026-10', 'period memakai UTC');

// --- 2. Alur kuota --------------------------------------------------------
{
  const db = new DatabaseSync(':memory:');
  const client = makeClient(db);

  const initial = await getUsage(client, 'u1');
  assert(initial.used === 0 && initial.remaining === 3, 'awal: 0 terpakai, 3 tersisa');

  assert((await checkQuota(client, 'u1')).allowed === true, 'kuota awal mengizinkan');

  await incrementUsage(client, 'u1');
  await incrementUsage(client, 'u1');
  const afterTwo = await getUsage(client, 'u1');
  assert(afterTwo.used === 2 && afterTwo.remaining === 1, 'dua pemakaian tercatat');

  await incrementUsage(client, 'u1');
  const exhausted = await checkQuota(client, 'u1');
  assert(exhausted.allowed === false, 'pemakaian ke-3 membuat kuota habis');
  assert(exhausted.usage.remaining === 0, 'remaining 0 saat habis');

  // User lain punya kuota sendiri.
  const other = await checkQuota(client, 'u2');
  assert(other.allowed === true && other.usage.used === 0, 'kuota terpisah per user');

  // Periode lain (bulan berikutnya) kembali 0.
  const nextMonth = await getUsage(client, 'u1', { period: '2026-11' });
  assert(nextMonth.used === 0 && nextMonth.remaining === 3, 'kuota reset di periode baru');

  db.close();
}

// --- 3. Fail-open ---------------------------------------------------------
{
  const broken = { execute: async () => { throw new Error('no such table'); } };
  const quota = await checkQuota(broken, 'u9');
  assert(quota.allowed === true, 'DB bermasalah → fitur tetap diizinkan');
  assert(quota.usage === null, 'usage null saat DB bermasalah');
}

// --- 4. Limit 0 = matikan total ------------------------------------------
{
  process.env.AI_AUTOFILL_MONTHLY_LIMIT = '0';
  const db = new DatabaseSync(':memory:');
  const quota = await checkQuota(makeClient(db), 'u1');
  assert(quota.allowed === false, 'limit 0 memblokir walaupun belum pernah dipakai');
  db.close();
}

// Schema "sudah siap" di-cache per modul; tidak ada timer yang menahan proses.
console.log(process.exitCode ? '\nAI QUOTA CHECK FAILED' : '\nAI QUOTA CHECK OK');
process.exit(process.exitCode || 0);
