import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local first (highest priority), then .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Get credentials from environment
const url = process.env.rz_TURSO_DATABASE_URL ?? process.env.RZ_TURSO_DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
const authToken = process.env.rz_TURSO_AUTH_TOKEN ?? process.env.RZ_TURSO_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

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

async function runMigration(migrationFile) {
  try {
    console.log(`🔄 Running migration: ${migrationFile}...\n`);
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'db', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolons and filter comments more carefully
    const statements = migrationSQL
      .split(';')
      .map(s => {
        // Remove comments
        const lines = s.split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n');
        return lines.trim();
      })
      .filter(s => s.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i+1}/${statements.length}] Executing: ${statement.substring(0, 60)}...`);
      try {
        await client.execute(statement);
        console.log('✅ Success\n');
      } catch (error) {
        // Some statements might fail if the column doesn't exist, that's okay
        if (error.message.includes('no such column') || error.message.includes('already exists')) {
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

async function main() {
  // Get migration file from command line argument or run default
  const migrationFile = process.argv[2] || 'migrations_rename_timestamps_to_time_markers.sql';
  
  await runMigration(migrationFile);
  
  // Verify the table structure
  console.log('\n📊 Verifying table structure...');
  const tableInfo = await client.execute('PRAGMA table_info(songs);');
  console.log('\nSongs table columns:');
  tableInfo.rows.forEach(row => {
    console.log(`  - ${row.name}: ${row.type}`);
  });
}

main();
