// scripts/applyMigrations.js
// Node.js script to apply all SQL migration files in supabase/migrations
// Reads database connection info from a .env file at the project root.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Build connection parameters from environment variables.
// Support both full DATABASE_URL or individual pg params.
const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
      database: process.env.PGDATABASE || 'postgres',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
    };

async function runMigrations() {
  const client = new Client(connectionConfig);
  await client.connect();

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // ensure chronological order

  console.log(`Applying ${files.length} migration(s)...`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`\n--- Executing ${file} ---`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`✅ ${file} applied`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`❌ Error applying ${file}:`, err.message);
      // Stop on first failure to avoid inconsistent state
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log('\nAll migrations applied successfully.');
}

runMigrations().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
