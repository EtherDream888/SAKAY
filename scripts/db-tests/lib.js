// Harness: emulates the Supabase pieces the SAKAY migrations rely on, on top of PGlite.
// Nothing here touches the repository or any hosted database.
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const MIG_DIR = path.join(__dirname, '..', '..', 'supabase', 'migrations');

const PREAMBLE = `
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid, aud text DEFAULT 'authenticated', role text DEFAULT 'authenticated',
  email text, phone text, encrypted_password text,
  email_confirmed_at timestamptz, phone_confirmed_at timestamptz, confirmed_at timestamptz,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb, raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
  is_sso_user boolean DEFAULT false, last_sign_in_at timestamptz,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(COALESCE(current_setting('request.jwt.claim.sub', true),
         (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb)->>'sub'), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.role', true),
         (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb)->>'role') $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;

CREATE SCHEMA storage;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array(name, '/') $$;

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
`;

async function newDb() {
  const { uuid_ossp } = require('@electric-sql/pglite/contrib/uuid_ossp');
  const db = new PGlite({ extensions: { uuid_ossp } });
  await db.exec(PREAMBLE);
  return db;
}

function listMigrations() {
  return fs.readdirSync(MIG_DIR).filter((f) => f.endsWith('.sql')).sort();
}

async function applyFile(db, file) {
  const sql = fs.readFileSync(path.join(MIG_DIR, file), 'utf8');
  await db.exec('BEGIN');
  try {
    await db.exec(sql);
    await db.exec('COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}

// Apply every migration whose name sorts <= `until` (inclusive). Returns list of results.
async function applyChain(db, until, { stopOnError = true } = {}) {
  const results = [];
  for (const f of listMigrations()) {
    if (until && f > until) break;
    try {
      await applyFile(db, f);
      results.push({ f, ok: true });
    } catch (e) {
      results.push({ f, ok: false, err: e.message });
      if (stopOnError) break;
    }
  }
  return results;
}

module.exports = { newDb, applyChain, applyFile, listMigrations, MIG_DIR };
