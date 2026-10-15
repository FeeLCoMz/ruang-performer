

import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';

// Cap the number of rows dumped per table so a very large database cannot
// exhaust server memory by materialising every INSERT statement at once.
const MAX_ROWS_PER_TABLE = 100_000;
// Fetch rows in chunks instead of one unbounded SELECT per table.
const ROW_CHUNK_SIZE = 1_000;

/**
 * Escape a value as a SQLite string literal, including control characters.
 * Without this, embedded newlines/NULL bytes in user data (e.g. lyrics) can
 * break or corrupt the generated .sql backup file.
 */
function toSqlLiteral(val) {
  if (val === null) return 'NULL';
  if (typeof val === 'number') return String(val);
  const escaped = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\0/g, '\\0');
  return `'${escaped}'`;
}

export default async function handler(req, res) {
  if (!verifyToken(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const client = getTursoClient();
  try {
    // 1. Get all user tables (ignore sqlite internal tables)
    const tablesRes = await client.execute(
      `SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    );
    const tables = tablesRes.rows;

    // 2. Collect CREATE TABLE statements, pastikan diakhiri ;
    const createTableStmts = tables
      .map(row => row.sql)
      .filter(Boolean)
      .map(stmt => {
        // Patch: pastikan CREATE TABLE pakai IF NOT EXISTS
        let patched = stmt.replace(/^CREATE TABLE(?! IF NOT EXISTS)/i, 'CREATE TABLE IF NOT EXISTS');
        return patched.trim().endsWith(';') ? patched.trim() : patched.trim() + ';';
      });

    // 3. Collect INSERT statements for each table
    const insertStmts = [];
    const truncatedTables = [];
    for (const { name } of tables) {
      // Chunked reads keep each query's result set small; the cap stops a
      // runaway table from ballooning the response beyond memory limits.
      let offset = 0;
      let tableRowCount = 0;
      for (;;) {
        const rowsRes = await client.execute(
          `SELECT * FROM "${name}" LIMIT ${ROW_CHUNK_SIZE} OFFSET ${offset}`
        );
        const rows = rowsRes.rows || [];
        if (!rows.length) break;
        for (const row of rows) {
          if (tableRowCount >= MAX_ROWS_PER_TABLE) {
            truncatedTables.push(name);
            break;
          }
          const columns = Object.keys(row).map(col => `"${col.replace(/"/g, '""')}"`).join(', ');
          const values = Object.values(row).map(toSqlLiteral).join(', ');
          insertStmts.push(`INSERT OR REPLACE INTO "${name}" (${columns}) VALUES (${values});`);
          tableRowCount += 1;
        }
        if (tableRowCount >= MAX_ROWS_PER_TABLE || rows.length < ROW_CHUNK_SIZE) break;
        offset += ROW_CHUNK_SIZE;
      }
    }

    // 4. Output as .sql file
    const sqlContent =
      '-- CREATE TABLES --\n' +
      createTableStmts.join('\n') +
      '\n\n-- INSERTS --\n' +
      insertStmts.join('\n') +
      '\n' +
      (truncatedTables.length
        ? `\n-- WARNING: backup truncated at ${MAX_ROWS_PER_TABLE} rows for tables: ${truncatedTables.join(', ')} --\n`
        : '');

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', 'attachment; filename="backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sql"');
    res.status(200).send(sqlContent);
  } catch (e) {
    res.status(500).json({ error: 'Backup failed', details: e.message });
  }
}
