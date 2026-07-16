import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// =============================
// Load environment variables
// =============================
dotenv.config({ path: '.env.local' }); // Highest priority
dotenv.config({ path: '.env' });

// =============================
// Get DB credentials
// =============================
const url = process.env.rz_TURSO_DATABASE_URL
  ?? process.env.RZ_TURSO_DATABASE_URL
  ?? process.env.TURSO_DATABASE_URL;
const authToken = process.env.rz_TURSO_AUTH_TOKEN
  ?? process.env.RZ_TURSO_AUTH_TOKEN
  ?? process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('❌ Missing database credentials');
  console.error('Required: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN');
  console.error('Environment variables checked:');
  console.error('  - rz_TURSO_DATABASE_URL:', process.env.rz_TURSO_DATABASE_URL ? '✓' : '✗');
  console.error('  - RZ_TURSO_DATABASE_URL:', process.env.RZ_TURSO_DATABASE_URL ? '✓' : '✗');
  console.error('  - TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? '✓' : '✗');
  process.exit(1);
}

const client = createClient({ url, authToken });

/**
 * Run a SQL migration file against the database
 * @param {string} migrationFile - Filename in db/ folder
 */
async function runMigration(migrationFile) {
  try {
    console.log(`\n🔄 Running migration: ${migrationFile}\n`);

    // Read migration SQL file
    const migrationPath = path.join(process.cwd(), 'db', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split into statements, remove comments
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
      )
      .filter(stmt => stmt.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 60)}...`);
      try {
        await client.execute(statement);
        console.log('✅ Success\n');
      } catch (error) {
        // Ignore common non-fatal errors
        if (
          error.message.includes('no such column') ||
          error.message.includes('already exists') ||
          error.message.includes('duplicate column name')
        ) {
          console.log(`⚠️  Skipped (${error.message.substring(0, 40)}...)\n`);
        } else {
          console.error(`❌ Error: ${error.message}`);
          throw error;
        }
      }
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Main entry: run migration and verify table structure
 */
async function main() {
  // Get migration file from command line argument
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('❌ Please specify a migration file, e.g. node runMigration.js migrations_example.sql');
    process.exit(1);
  }

  await runMigration(migrationFile);

  // Verify all table structures
  console.log('\n📊 Verifying all table structures...');
  const tablesResult = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
  const tableNames = tablesResult.rows.map(row => row.name);
  if (tableNames.length === 0) {
    console.log('No tables found in the database.');
    return;
  }
  for (const tableName of tableNames) {
    console.log(`\nTable: ${tableName}`);
    const tableInfo = await client.execute(`PRAGMA table_info(${tableName});`);
    if (tableInfo.rows.length === 0) {
      console.log('  (No columns found)');
    } else {
      tableInfo.rows.forEach(row => {
        console.log(`  - ${row.name}: ${row.type}`);
      });
    }
  }
}

main();
