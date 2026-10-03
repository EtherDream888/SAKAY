const { newDb, applyChain } = require('./lib');

async function freshDb(until) {
  const db = await newDb();
  const res = await applyChain(db, until, { stopOnError: true });
  const bad = res.find((r) => !r.ok);
  if (bad) throw new Error('migration failed: ' + bad.f + ' -> ' + bad.err);
  return db;
}

// Run `fn(tx)` as an authenticated Supabase user (or service role / anon). Always rolls back unless commit=true.
async function asUser(db, { uid = null, role = 'authenticated' } = {}, fn, { commit = false } = {}) {
  let out;
  try {
    await db.transaction(async (tx) => {
      await tx.query(`SET LOCAL ROLE ${role}`);
      await tx.query(`SELECT set_config('request.jwt.claim.role', $1, true)`, [role]);
      await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid || '']);
      out = await fn(tx);
      if (!commit) throw new Error('__ROLLBACK__');
    });
  } catch (e) {
    if (e.message !== '__ROLLBACK__') throw e;
  }
  return out;
}

// Run and capture either the value or the error message.
async function attempt(fn) {
  try { return { ok: true, value: await fn() }; }
  catch (e) { return { ok: false, error: e.message }; }
}

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}
function summary() { console.log(`\n${pass} passed, ${fail} failed`); return fail === 0; }

module.exports = { freshDb, asUser, attempt, check, summary };
