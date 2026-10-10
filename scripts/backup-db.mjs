import { createClient } from '@libsql/client';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Full logical backup of the Turso (libSQL) database.
 *
 * Writes a timestamped .sql dump (schema + data as INSERT statements) plus a
 * .json snapshot of every table, so the data can be restored by hand if a
 * migration goes wrong.
 *
 * Usage:  node scripts/backup-db.mjs
 */

function loadEnvLocal() {
  const text = readFileSync('.env.local', 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

/**
 * Collapse a possibly multi-line statement onto a single line so a line-based
 * replay can execute it. Inline `--` comments are stripped first: collapsing
 * them onto one line would comment out everything that followed them, which
 * silently produced an unparseable CREATE TABLE.
 */
const oneLine = (sql) =>
  String(sql)
    .split(/\r?\n/)
    // `.*` does not match \r, and a non-multiline `$` will not match before it
    // either, so stripping the comment needs an explicit class here.
    .map((line) => line.replace(/--[^\r\n]*/g, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

loadEnvLocal();

const url =
  process.env.rz_TURSO_DATABASE_URL ??
  process.env.RZ_TURSO_DATABASE_URL ??
  process.env.TURSO_DATABASE_URL;
const authToken =
  process.env.rz_TURSO_AUTH_TOKEN ??
  process.env.RZ_TURSO_AUTH_TOKEN ??
  process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Missing Turso credentials in .env.local');
  process.exit(1);
}

const client = createClient({ url, authToken });

const quote = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'bigint') return String(value);
  if (value instanceof Uint8Array) {
    return `X'${Buffer.from(value).toString('hex')}'`;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  // SQLite string literals may contain real newlines, but this dump is replayed
  // one statement per line, so newlines are escaped and un-escaped on restore.
  return `'${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\n')}'`;
};

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = join('backups', timestamp);
mkdirSync(outDir, { recursive: true });

console.log(`Backing up to ${outDir}\n`);

const tablesResult = await client.execute(
  "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
);
const tables = tablesResult.rows;

if (!tables.length) {
  console.error('No tables found — refusing to write an empty backup.');
  process.exit(1);
}

const sqlLines = [
  `-- Backup of Ruang Performer database`,
  `-- Taken at ${new Date().toISOString()}`,
  `-- Source: ${url.replace(/\/\/.*@/, '//<redacted>@')}`,
  '',
  'PRAGMA foreign_keys = OFF;',
  'BEGIN TRANSACTION;',
  '',
];

const snapshot = {};
let totalRows = 0;

for (const table of tables) {
  const name = table.name;
  const { rows } = await client.execute(`SELECT * FROM "${name}"`);
  snapshot[name] = rows;
  totalRows += rows.length;

  console.log(`${name.padEnd(24)} ${String(rows.length).padStart(5)} rows`);

  sqlLines.push(`-- ---------- ${name} (${rows.length} rows) ----------`);
  if (table.sql) {
    sqlLines.push(`DROP TABLE IF EXISTS "${name}";`);
    sqlLines.push(`${oneLine(table.sql)};`);
  }

  if (rows.length) {
    const columns = Object.keys(rows[0]);
    const columnList = columns.map((c) => `"${c}"`).join(', ');
    for (const row of rows) {
      const values = columns.map((c) => quote(row[c])).join(', ');
      sqlLines.push(`INSERT INTO "${name}" (${columnList}) VALUES (${values});`);
    }
  }
  sqlLines.push('');
}

// Indexes and triggers are part of the schema and must survive a restore.
const otherObjects = await client.execute(
  "SELECT sql FROM sqlite_master WHERE type IN ('index','trigger','view') AND sql IS NOT NULL ORDER BY type, name"
);
if (otherObjects.rows.length) {
  sqlLines.push('-- ---------- indexes / triggers / views ----------');
  for (const row of otherObjects.rows) {
    sqlLines.push(`${oneLine(row.sql)};`);
  }
  sqlLines.push('');
}

sqlLines.push('COMMIT;');
sqlLines.push('PRAGMA foreign_keys = ON;');

writeFileSync(join(outDir, 'dump.sql'), sqlLines.join('\n'), 'utf8');
writeFileSync(join(outDir, 'snapshot.json'), JSON.stringify(snapshot, null, 2), 'utf8');

const manifest = {
  takenAt: new Date().toISOString(),
  database: url.replace(/\/\/.*@/, '//<redacted>@'),
  tables: tables.map((t) => t.name),
  rowCounts: Object.fromEntries(Object.entries(snapshot).map(([k, v]) => [k, v.length])),
  totalRows,
};
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

client.close();

console.log(`\nTotal: ${tables.length} tables, ${totalRows} rows`);
console.log(`Written: ${join(outDir, 'dump.sql')}`);
console.log(`         ${join(outDir, 'snapshot.json')}`);
console.log(`         ${join(outDir, 'manifest.json')}`);
