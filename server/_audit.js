/**
 * _audit.js
 *
 * Helper penulisan audit log untuk handler backend.
 *
 * Nilai `category` & `severity` memakai aturan yang sama dengan
 * `src/utils/auditLogger.js`, sehingga entri baru konsisten dengan entri
 * reset password lama saat difilter di halaman modul Audit Log.
 *
 * Aturannya diduplikasi di sini (bukan di-import dari src/) karena file ini
 * ikut di-bundle ke serverless function; import statis lintas folder ke src/
 * berisiko gagal di build Vercel.
 *
 * Penting: helper ini TIDAK pernah melempar error. Kegagalan audit (mis. tabel
 * belum ada / kolom beda versi) tidak boleh menggagalkan request utama.
 */

/** Aksi yang dianggap kritis (cermin getActionSeverity). */
const CRITICAL_ACTIONS = new Set([
  'BAND_DELETED',
  'MEMBER_REMOVED',
  'USER_PASSWORD_CHANGE',
  'MEMBER_ROLE_CHANGED',
  'PERMISSION_REVOKED',
  'USER_DELETED',
]);

/** Aksi berisiko tinggi (cermin getActionSeverity). */
const HIGH_ACTIONS = new Set([
  'BAND_CREATED',
  'MEMBER_INVITED',
  'MEMBER_JOINED',
  'PERMISSION_GRANTED',
  'USER_PASSWORD_RESET',
]);

/** Kategori dari prefix action — sama dengan getActionCategory(). */
export function resolveActionCategory(action) {
  if (action.startsWith('USER_')) return 'USER';
  if (action.startsWith('BAND_')) return 'BAND';
  // Role perubahan anggota tergolong aksi permission (lihat getActionCategory).
  if (action === 'MEMBER_ROLE_CHANGED') return 'PERMISSION';
  if (action.startsWith('MEMBER_')) return 'MEMBER';
  if (action.startsWith('PERMISSION_') || action.startsWith('ROLE_')) return 'PERMISSION';
  if (action.startsWith('SONG_')) return 'SONG';
  if (action.startsWith('SETLIST_')) return 'SETLIST';
  return 'SECURITY';
}

/** Severity dari action — sama dengan getActionSeverity(). */
export function resolveActionSeverity(action) {
  if (CRITICAL_ACTIONS.has(action)) return 'critical';
  if (HIGH_ACTIONS.has(action)) return 'high';
  // Login gagal / diblokir adalah indikasi brute-force → setara aksi berisiko tinggi.
  if (action === 'USER_LOGIN_FAILED' || action === 'USER_LOGIN_BLOCKED') return 'high';
  if (action.includes('UPDATED')) return 'medium';
  return 'low';
}

/** 'SONG_UPDATED' → 'Song Updated' — sama dengan formatActionName(). */
export function resolveActionDisplayName(action) {
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Kolom audit_logs yang dipakai writeAuditLog; kolom lain opsional. */
const AUDIT_LOG_COLUMNS = {
  userId: 'TEXT',
  action: 'TEXT',
  category: 'TEXT',
  severity: "TEXT DEFAULT 'low'",
  status: "TEXT DEFAULT 'success'",
  bandId: 'TEXT',
  targetUserId: 'TEXT',
  resourceId: 'TEXT',
  resourceType: 'TEXT',
  description: 'TEXT',
  details: 'TEXT',
  ipAddress: 'TEXT',
  userAgent: 'TEXT',
  changes: 'TEXT',
  createdAt: "TEXT DEFAULT (datetime('now'))",
};

// Schema dicek sekali per DATABASE (bukan per client object). Di serverless,
// getTursoClient() membuat client baru di tiap cold start, sehingga penanda
// berbasis WeakSet tidak pernah bertahan dan CREATE/PRAGMA/ALTER berjalan ulang
// di setiap request (4 query tambahan per simpan setlist).
const _auditSchemaReadyDatabases = new Set();

function resolveAuditSchemaKey(client) {
  // @libsql/client menyimpan url koneksi di beberapa properti internal.
  const url = client?.url
    || client?._client?.url
    || client?.client?.url
    || client?.config?.url
    || client?.options?.url;
  return typeof url === 'string' && url ? url : null;
}

/**
 * Pastikan tabel audit_logs ada. Tabel ini tidak selalu ada di database lama
 * karena schema.sql dulu belum memuatnya → semua insert audit gagal dengan
 * "no such table: audit_logs".
 */
export async function ensureAuditLogTable(client) {
  if (!client) return false;
  const schemaKey = resolveAuditSchemaKey(client);
  if (schemaKey && _auditSchemaReadyDatabases.has(schemaKey)) return true;
  try {
    await client.execute(
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        ${Object.entries(AUDIT_LOG_COLUMNS).map(([name, type]) => `${name} ${type}`).join(',\n        ')}
      )`,
    );

    // Instalasi lama bisa punya audit_logs versi awal (kolom lebih sedikit).
    const columnsResult = await client.execute('PRAGMA table_info(audit_logs)');
    const existing = new Set((columnsResult.rows || []).map((row) => String(row.name)));
    const extraColumns = {
      targetUserId: 'TEXT',
      resourceId: 'TEXT',
      resourceType: 'TEXT',
      description: 'TEXT',
      details: 'TEXT',
      ipAddress: 'TEXT',
      userAgent: 'TEXT',
      changes: 'TEXT',
      bandId: 'TEXT',
    };
    for (const [name, type] of Object.entries(extraColumns)) {
      if (existing.has(name)) continue;
      // eslint-disable-next-line no-await-in-loop
      await client.execute(`ALTER TABLE audit_logs ADD COLUMN ${name} ${type}`).catch(() => {});
    }

    await client.execute(
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_userId_createdAt ON audit_logs(userId, createdAt)',
    ).catch(() => {});

    if (schemaKey) _auditSchemaReadyDatabases.add(schemaKey);
    return true;
  } catch (error) {
    // Jangan cache kegagalan supaya percobaan berikutnya masih mencoba.
    console.warn('ensureAuditLogTable gagal:', error?.message || error);
    return false;
  }
}

/**
 * Insert satu entri audit log.
 *
 * @param {object} client - Turso client (lihat server/_turso.js).
 * @param {object} params
 * @param {string} params.action - Salah satu AUDIT_ACTIONS, mis. 'SONG_UPDATED'.
 * @param {string} [params.userId] - Pelaku aksi.
 * @param {string|null} [params.bandId]
 * @param {string|null} [params.targetUserId]
 * @param {string|null} [params.resourceId]
 * @param {string|null} [params.resourceType]
 * @param {object} [params.changes] - Ringkasan perubahan (di-JSON kan).
 * @param {string} [params.description]
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @param {'success'|'failed'} [params.status='success']
 * @param {string} [params.errorMessage] - Disimpan ke details saat gagal.
 */
export async function writeAuditLog(client, {
  action,
  userId,
  bandId = null,
  targetUserId = null,
  resourceId = null,
  resourceType = null,
  changes = null,
  description = null,
  ipAddress = null,
  userAgent = null,
  status = 'success',
  errorMessage = null,
} = {}) {
  if (!client || !action) return false;

  // Tabel dibuat otomatis bila belum ada (database lama).
  await ensureAuditLogTable(client);

  // details menggabungkan ringkasan perubahan dengan identitas resource,
  // dan tetap diisi walau changes kosong agar resource id tidak hilang.
  let details = null;
  if (resourceId || resourceType || targetUserId || errorMessage
    || (changes && Object.keys(changes).length > 0)) {
    try {
      details = JSON.stringify({
        ...(changes || {}),
        resourceId,
        resourceType,
        targetUserId,
        ...(errorMessage ? { errorMessage } : {}),
      });
    } catch {
      details = null;
    }
  }

  try {
    await client.execute({
      sql: `INSERT INTO audit_logs
              (id, userId, action, category, severity, status, bandId,
               description, details, ipAddress, userAgent, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        // id unik tanpa dependency tambahan
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        userId || null,
        action,
        resolveActionCategory(action),
        resolveActionSeverity(action),
        status === 'failed' ? 'failed' : 'success',
        bandId || null,
        description || resolveActionDisplayName(action),
        details,
        ipAddress || null,
        userAgent || null,
        new Date().toISOString(),
      ],
    });
    return true;
  } catch (error) {
    // Skema audit_logs beda versi atau tabel belum ada: abaikan.
    console.warn(`Audit log skipped (${action}):`, error?.message || error);
    return false;
  }
}

/** Ambil IP & user-agent dari request untuk dicatat. */
export function getRequestMeta(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  const ipAddress = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || null;
  const userAgent = req?.headers?.['user-agent'] || null;
  return { ipAddress, userAgent };
}

export default writeAuditLog;
