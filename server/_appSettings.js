/**
 * appSettings.js
 *
 * Penyimpanan pengaturan aplikasi GLOBAL di database (tabel `app_settings`).
 *
 * Pengaturan seperti kelompok tag ChordDisplay harus berlaku untuk SEMUA user
 * di semua perangkat — bukan per browser. Nilainya berupa JSON per key,
 * sehingga menambah pengaturan baru tidak memerlukan migrasi kolom.
 *
 * Tabel dibuat otomatis (CREATE TABLE IF NOT EXISTS) seperti audit_logs &
 * ai_usage, jadi database lama tidak perlu migrasi manual.
 */
import { getTursoClient } from './_turso.js';

const TABLE = 'app_settings';

// Satu klien = satu database; schema cukup dicek sekali.
const schemaReadyClients = new WeakSet();

async function ensureTable(client) {
  if (typeof client === 'object' && schemaReadyClients.has(client)) return;
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT DEFAULT (datetime('now')),
      updatedBy TEXT
    )
  `);
  if (typeof client === 'object') schemaReadyClients.add(client);
}

/**
 * Baca satu pengaturan.
 * @returns {Promise<*|null>} Nilai JSON, atau null bila belum pernah disimpan.
 */
export async function readSetting(client, key, { fallback = null } = {}) {
  if (!client || !key) return fallback;
  try {
    await ensureTable(client);
    const result = await client.execute({
      sql: `SELECT value FROM ${TABLE} WHERE key = ? LIMIT 1`,
      args: [key],
    });
    const raw = result.rows?.[0]?.value;
    if (typeof raw !== 'string' || !raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Setting "${key}" read skipped:`, error?.message || error);
    return fallback;
  }
}

/**
 * Simpan satu pengaturan (replace). Melempar error bila DB gagal, supaya
 * pemanggil bisa melaporkan kegagalan ke admin, bukan diam-diam tersimpan.
 */
export async function writeSetting(client, key, value, { updatedBy = null } = {}) {
  if (!client || !key) throw new Error('Setting key diperlukan');
  await ensureTable(client);
  await client.execute({
    sql: `INSERT INTO ${TABLE} (key, value, updatedAt, updatedBy)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updatedAt = excluded.updatedAt,
            updatedBy = excluded.updatedBy`,
    args: [key, JSON.stringify(value), new Date().toISOString(), updatedBy],
  });
  return value;
}

/** Hapus pengaturan (kembali ke bawaan aplikasi). */
export async function deleteSetting(client, key) {
  if (!client || !key) return;
  await ensureTable(client);
  await client.execute({
    sql: `DELETE FROM ${TABLE} WHERE key = ?`,
    args: [key],
  });
}

/** Klien default (Turso); dipisah agar handler mudah diuji. */
export const defaultClient = () => getTursoClient();

export default { readSetting, writeSetting, deleteSetting, defaultClient };
