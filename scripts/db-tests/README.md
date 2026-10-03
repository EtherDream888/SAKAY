# Database tests (local PostgreSQL emulator)

These suites run the real `supabase/migrations/*.sql` on [PGlite](https://pglite.dev) (PostgreSQL in
WebAssembly) so policy rules enforced in the database can be tested without a Supabase project.
**They never connect to Supabase.**

```bash
node scripts/db-tests/run-all.js            # everything
node scripts/db-tests/run-all.js batch3     # one folder
node scripts/db-tests/run-all.js engine     # suites whose path contains "engine"
```

## How it works
- `lib.js` builds the Supabase pieces the migrations rely on: the `anon` / `authenticated` /
  `service_role` roles (`service_role` bypasses RLS like the real one), `auth.users`,
  `auth.uid()` / `auth.role()` / `auth.jwt()` (read from `request.jwt.claim.*`), a `storage` schema, and
  `uuid-ossp`. It then applies the migrations in order, optionally stopping at a given file.
- `tlib.js` has `freshDb(untilMigration)`, `asUser(db, { uid, role }, fn)` (runs `fn` as a signed-in user, a
  service role or anon inside a transaction), `attempt()` and `check()`.
- `fixtures.js` seeds two passengers, drivers in two TODAs, an LGU admin and two TODA admins.
- Each suite prints `N passed, M failed` and exits non-zero on failure.

## Writing a suite for a new batch
1. Create `scripts/db-tests/<batchN>/<topic>.js`.
2. `const db = await freshDb('<last migration file of the batch>.sql')`, `await seed(db)`.
3. Call engine functions as the caller you want to test (`asUser(db, { uid: ID.L_AUTH }, ...)` for an LGU
   admin, `{ role: 'service_role' }` for the server, `{ uid: ID.P_AUTH }` for a passenger).
4. Pass `{ commit: true }` to `asUser` when later steps need the data; otherwise it rolls back.

## Pitfalls
- The engine is a single connection: never `await db.query()` while inside an `asUser` callback (it waits
  for the transaction and hangs). Resolve ids before opening the transaction.
- A passing "can do X" check that updated 0 rows proves nothing; assert `rowCount` for writes.
- Updating a column to the value it already has is not a change, so protection triggers will not fire.

## Known workaround
`lib.js` patches one statement of `20260927000000_fix_database_advisor_and_rls.sql` in memory (its `toda`
policies use `account_status`, which `20260828000003` renamed to `toda_status`). Remove the `PATCHES`
entry once that migration is fixed.
