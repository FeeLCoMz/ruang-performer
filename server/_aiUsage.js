/**
 * aiUsage.js
 *
 * Pencatatan & pengecekan kuota AI Autofill per user per bulan.
 *
 * Tujuan: pemakaian Gemini berbiaya, jadi kita perlu tahu berapa banyak panggilan
 * yang dilakukan dan bisa membatasi penyalahgunaan (mis. klik berulang).
 *
 * Skema tabel dibuat otomatis (CREATE TABLE IF NOT EXISTS) seperti audit_logs,
 * sehingga database lama tidak perlu migrasi manual.
 *
 * Semua fungsi bersifat best-effort: kegagalan DB tidak boleh membuat request
 * AI gagal (kecuali saat pemeriksaan kuota benar-benar berhasil → diblokir).
 */

const TABLE = 'ai_usage';
const DEFAULT_MONTHLY_LIMIT = 100;

/** Batas per user per bulan; bisa dioverride lewat env AI_AUTOFILL_MONTHLY_LIMIT. */
export function getMonthlyLimit() {
  const raw = Number.parseInt(process.env.AI_AUTOFILL_MONTHLY_LIMIT ?? '', 10);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_MONTHLY_LIMIT;
}

/** Periode berformat YYYY-MM (UTC) — kunci unik per user per bulan. */
export function currentPeriod(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Schema dicek sekali per client (WeakSet), bukan per modul: satu instance
// server memakai satu client, tetapi test/multi-DB tetap membuat tabel di
// database masing-masing.
const schemaReadyClients = new WeakSet();

async function ensureTable(client) {
  if (typeof client === 'object' && schemaReadyClients.has(client)) return;
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      userId TEXT NOT NULL,
      period TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (userId, period)
    )
  `);
  if (typeof client === 'object') schemaReadyClients.add(client);
}

/**
 * Baca pemakaian user pada periode berjalan.
 *
 * @returns {Promise<{ used: number, limit: number, remaining: number, period: string } | null>}
 *          null bila DB tidak tersedia (kuota tidak bisa diperiksa).
 */
export async function getUsage(client, userId, { period = currentPeriod() } = {}) {
  if (!client || !userId) return null;
  try {
    await ensureTable(client);
    const result = await client.execute({
      sql: `SELECT used FROM ${TABLE} WHERE userId = ? AND period = ? LIMIT 1`,
      args: [userId, period],
    });
    const used = Number(result.rows?.[0]?.used || 0);
    const limit = getMonthlyLimit();
    return { used, limit, remaining: Math.max(0, limit - used), period };
  } catch (error) {
    console.warn('AI usage read skipped:', error?.message || error);
    return null;
  }
}

/**
 * Tambah pemakaian sebanyak 1 untuk user.
 * @returns {Promise<boolean>} true bila tercatat.
 */
export async function incrementUsage(client, userId, { period = currentPeriod() } = {}) {
  if (!client || !userId) return false;
  try {
    await ensureTable(client);
    await client.execute({
      sql: `INSERT INTO ${TABLE} (userId, period, used, updatedAt)
            VALUES (?, ?, 1, ?)
            ON CONFLICT(userId, period) DO UPDATE SET
              used = used + 1,
              updatedAt = excluded.updatedAt`,
      args: [userId, period, new Date().toISOString()],
    });
    return true;
  } catch (error) {
    console.warn('AI usage write skipped:', error?.message || error);
    return false;
  }
}

/**
 * Periksa apakah user masih boleh memakai AI Autofill.
 *
 * @returns {Promise<{ allowed: boolean, usage: object|null }>}
 *          `allowed=true` juga dikembalikan bila kuota tidak bisa dibaca
 *          (fail-open: jangan matikan fitur karena masalah DB sementara).
 */
export async function checkQuota(client, userId) {
  const usage = await getUsage(client, userId);
  if (!usage) return { allowed: true, usage: null };
  if (usage.limit === 0) return { allowed: false, usage }; // 0 = matikan total
  return { allowed: usage.used < usage.limit, usage };
}

export default { getMonthlyLimit, currentPeriod, getUsage, incrementUsage, checkQuota };
