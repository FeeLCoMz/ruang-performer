import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Verify a backup WITHOUT touching the live database: replay the dump into a
 * throwaway in-memory libSQL database and compare row counts against the
 * manifest. A backup you have never restored is not a backup.
 *
 * Usage:  node scripts/verify-backup.mjs [backupDir]
 */

const backupsRoot = 'backups';
const targetDir =
  process.argv[2] ||
  join(
    backupsRoot,
    readdirSync(backupsRoot)
      .filter((name) => !name.startsWith('.'))
      .sort()
      .pop()
  );

console.log(`Verifying: ${targetDir}\n`);

const dump = readFileSync(join(targetDir, 'dump.sql'), 'utf8');
const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf8'));

const { createClient } = await import('@libsql/client');
const mem = createClient({ url: ':memory:' });

// Replay the dump statement by statement. The dump writes one statement per
// line, so newlines inside string values are escaped as \n and must be
// translated back before the statement reaches SQLite.
const statements = dump
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('--'));

/** Turn the escaped \n back into real newlines, but only inside string literals. */
const unescapeNewlines = (statement) => {
  let out = '';
  let inString = false;
  for (let i = 0; i < statement.length; i += 1) {
    const char = statement[i];
    if (char === "'") {
      if (inString && statement[i + 1] === "'") {
        out += "''";
        i += 1;
        continue;
      }
      inString = !inString;
      out += char;
      continue;
    }
    if (inString && char === '\\' && statement[i + 1] === 'n') {
      out += '\n';
      i += 1;
      continue;
    }
    if (inString && char === '\\' && statement[i + 1] === '\\') {
      out += '\\';
      i += 1;
      continue;
    }
    out += char;
  }
  return out;
};

let executed = 0;
const failures = [];

for (const statement of statements) {
  try {
    await mem.execute(unescapeNewlines(statement));
    executed += 1;
  } catch (error) {
    failures.push({ statement: statement.slice(0, 120), error: error.message });
  }
}

console.log(`Statements executed: ${executed}/${statements.length}`);
if (failures.length) {
  console.log(`\nFAILURES (${failures.length}):`);
  for (const f of failures.slice(0, 10)) {
    console.log(`  ${f.statement}\n    -> ${f.error}`);
  }
}

// Compare restored row counts with the manifest.
const mismatches = [];
for (const [table, expected] of Object.entries(manifest.rowCounts)) {
  const result = await mem.execute(`SELECT COUNT(*) AS count FROM "${table}"`);
  const actual = Number(result.rows[0].count);
  if (actual !== expected) {
    mismatches.push({ table, expected, actual });
  }
}

console.log(`\nTable row counts compared: ${Object.keys(manifest.rowCounts).length}`);
if (mismatches.length) {
  console.log('MISMATCHES:');
  for (const m of mismatches) {
    console.log(`  ${m.table}: expected ${m.expected}, restored ${m.actual}`);
  }
} else {
  console.log('All row counts match the manifest.');
}

mem.close();

const ok = failures.length === 0 && mismatches.length === 0;
console.log(`\n${ok ? 'BACKUP VERIFIED — restorable' : 'BACKUP PROBLEM — see above'}`);
process.exit(ok ? 0 : 1);
