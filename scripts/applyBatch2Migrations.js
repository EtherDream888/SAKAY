// scripts/applyBatch2Migrations.js
// Applies ONLY the 4 Batch 2 migration files to Supabase Cloud.
// Uses pg with DATABASE_URL from .env at the project root.

require('dotenv').config({ path: require('path').join(__dirname, '..', 'apps', 'passenger-pwa', '.env') });
// Fallback: try root .env
if (!process.env.DATABASE_URL && !process.env.PGHOST) {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
}

const { Client } = require('pg');
const fs   = require('fs');
const path = require('path');

const BATCH2_FILES = [
  '20261003000001_add_passenger_constraints.sql',
  '20261003000002_otp_lockout_trigger.sql',
  '20261003000003_one_open_booking_guard.sql',
  '20261003000004_add_driver_session.sql',
];

const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host:     process.env.PGHOST     || 'localhost',
      port:     parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE || 'postgres',
      user:     process.env.PGUSER     || 'postgres',
      password: process.env.PGPASSWORD || '',
      ssl:      { rejectUnauthorized: false },
    };

async function run() {
  const client = new Client(connectionConfig);
  await client.connect();
  console.log('Connected to database.\n');

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

  for (const file of BATCH2_FILES) {
    const filePath = path.join(migrationsDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found, skipping: ${file}`);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`--- Executing ${file} ---`);
    try {
      await client.query(sql);
      console.log(`✅ ${file} applied\n`);
    } catch (err) {
      console.error(`❌ Error in ${file}:`, err.message);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log('All Batch 2 migrations applied.');
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
