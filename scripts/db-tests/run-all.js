// Runs every database test suite under scripts/db-tests/<batch>/*.js on a local PostgreSQL
// emulator (PGlite). Nothing here connects to Supabase.
//
//   node scripts/db-tests/run-all.js            run everything
//   node scripts/db-tests/run-all.js batch3     run one folder
//   node scripts/db-tests/run-all.js engine     run suites whose path contains "engine"
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const filter = process.argv[2];

function listSuites() {
  const suites = [];
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const file of fs.readdirSync(path.join(ROOT, entry.name))) {
      if (file.endsWith('.js')) suites.push(path.join(entry.name, file));
    }
  }
  return suites.sort();
}

const suites = listSuites().filter((s) => !filter || s.includes(filter));
if (suites.length === 0) {
  console.error(`No suites match "${filter}".`);
  process.exit(2);
}

let failed = 0;
for (const suite of suites) {
  const started = Date.now();
  const res = spawnSync(process.execPath, [path.join(ROOT, suite)], { encoding: 'utf8' });
  const out = (res.stdout || '') + (res.stderr || '');
  const summary = out.split('\n').filter((l) => /\d+ passed, \d+ failed/.test(l)).pop() || '(no summary line)';
  const ok = res.status === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${suite.padEnd(36)} ${summary.trim()}  [${((Date.now() - started) / 1000).toFixed(1)}s]`);
  if (!ok) console.log(out.split('\n').filter((l) => /FAIL|ERROR/.test(l)).slice(0, 15).join('\n'));
}

console.log(`\n${suites.length - failed}/${suites.length} suites passed`);
process.exit(failed === 0 ? 0 : 1);
