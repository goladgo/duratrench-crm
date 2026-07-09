// Runs a .sql file directly against Postgres, bypassing the Supabase web SQL editor
// (whose Monaco-based autocomplete can corrupt large pastes).
//
// Usage:
//   DATABASE_URL="postgres://postgres:PASSWORD@HOST:5432/postgres" node scripts/run-sql.mjs supabase/seed.sql

import { readFileSync } from "node:fs";
import { Client } from "pg";

const file = process.argv[2];
if (!file) {
  console.error("Usage: DATABASE_URL=... node scripts/run-sql.mjs <path-to-sql-file>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL env var. Set it to your Supabase connection string.");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query(sql);
  console.log(`Ran ${file} successfully.`);
} catch (err) {
  console.error("Failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
