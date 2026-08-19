/**
 * Runs the SQL migrations against your Supabase database.
 *
 *   node scripts/migrate.mjs                      # runs migrations/0001_init.sql
 *   node scripts/migrate.mjs supabase/other.sql   # runs a specific file
 *
 * Reads SUPABASE_DB_URL from .env.local. That file is gitignored and is never
 * printed by this script — the connection string carries your database
 * password, so it stays on your machine.
 *
 * Get the value from:
 *   Supabase Dashboard → Project Settings → Database → Connection string → URI
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readEnvLocal() {
  const file = join(root, ".env.local");
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...readEnvLocal(), ...process.env };
const url = env.SUPABASE_DB_URL;

if (!url) {
  console.error(`
✗ SUPABASE_DB_URL is not set.

  1. Supabase Dashboard → Project Settings → Database → Connection string → URI
  2. Copy it, and replace [YOUR-PASSWORD] with your database password
  3. Add it as a single line at the bottom of nabta-source/.env.local:

     SUPABASE_DB_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres

  4. Run this again:  npm run db:migrate

  .env.local is gitignored, and this script never prints the value.
`);
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) files.push("supabase/migrations/0001_init.sql");

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

// RAISE NOTICE from the migration's DO blocks is worth seeing.
client.on("notice", (n) => {
  if (n.message) console.log("   ·", n.message);
});

try {
  console.log("→ connecting…");
  await client.connect();
  console.log("✓ connected\n");

  for (const rel of files) {
    const path = join(root, rel);
    if (!existsSync(path)) {
      console.error(`✗ not found: ${rel}`);
      process.exitCode = 1;
      continue;
    }
    const sql = readFileSync(path, "utf8");
    console.log(`→ running ${rel} (${(sql.length / 1024).toFixed(1)} kB)…`);
    await client.query(sql);
    console.log(`✓ ${rel} applied\n`);
  }

  // Prove it landed, rather than trusting the absence of an error.
  const checks = await client.query(`
    select
      (select count(*) from public.profiles)                     as profiles,
      (select count(*) from public.demo_scans)                   as demo_scans,
      (select count(*) from public.advisories)                   as advisories,
      (select count(*) from storage.buckets
        where id = 'plant-photos')                               as bucket,
      (select count(*) from auth.users
        where email in ('user@nabta.ae','gov@nabta.ae','admin@nabta.ae')
          and email_confirmed_at is not null)                    as demo_logins_ready
  `);
  const r = checks.rows[0];
  console.log("── verification ──────────────────────────────");
  console.log(`   profiles           ${r.profiles}`);
  console.log(`   demo district rows ${r.demo_scans}`);
  console.log(`   advisories         ${r.advisories}`);
  console.log(`   photo bucket       ${r.bucket === "1" ? "created" : "MISSING"}`);
  console.log(`   demo logins ready  ${r.demo_logins_ready} of 3`);

  const roles = await client.query(`
    select u.email, p.role
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.email in ('user@nabta.ae','gov@nabta.ae','admin@nabta.ae')
    order by u.email
  `);
  console.log("\n── demo accounts ─────────────────────────────");
  for (const row of roles.rows) {
    console.log(`   ${row.email.padEnd(18)} ${row.role}`);
  }
  console.log();
} catch (err) {
  console.error("\n✗ migration failed\n");
  console.error("  ", err.message);
  if (err.position) console.error("   at character", err.position);
  if (err.hint) console.error("   hint:", err.hint);
  process.exitCode = 1;
} finally {
  await client.end();
}
