import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRESQLCONNSTR_DATABASE_URL;
}

function getDbName(databaseUrl) {
  try {
    const u = new URL(databaseUrl);
    return (u.pathname || "").replace(/^\//, "");
  } catch {
    return "";
  }
}

async function applyMigrations(client) {
  const migrationsDir = path.resolve(__dirname, "..", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+_.*\.sql$/i.test(f))
    .sort((a, b) => a.localeCompare(b));

  // Ensure schema_migrations exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const applied = await client.query("SELECT id FROM schema_migrations");
  const appliedSet = new Set(applied.rows.map((r) => r.id));

  for (const filename of files) {
    if (appliedSet.has(filename)) continue;
    const fullPath = path.join(migrationsDir, filename);
    const sql = fs.readFileSync(fullPath, "utf8");
    console.log(`Applying migration: ${filename}`);
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [filename]);
  }
}

async function main() {
  // Load local env files for developer convenience.
  dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });
  dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    console.error("Missing DATABASE_URL (or POSTGRESQLCONNSTR_DATABASE_URL).");
    process.exit(1);
  }

  // Safety: require explicit opt-in.
  // We never want to drop schemas by accident.
  if (process.env.ALLOW_DB_RESET !== "true") {
    console.error('Refusing to reset DB. Set ALLOW_DB_RESET="true" to proceed.');
    process.exit(1);
  }

  // Extra safety: refuse in production mode unless explicitly overridden.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DB_RESET_IN_PROD !== "true") {
    console.error(
      'Refusing to reset DB in production mode. Set ALLOW_DB_RESET_IN_PROD="true" ONLY if you are absolutely sure.'
    );
    process.exit(1);
  }

  const dbName = getDbName(databaseUrl);
  console.log(`Resetting database: ${dbName || "(unknown)"}`);

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: (() => {
      const sslRequired =
        databaseUrl.includes(".postgres.database.azure.com") ||
        /[?&]sslmode=(require|verify-ca|verify-full)(?:&|$)/i.test(databaseUrl) ||
        process.env.NODE_ENV === "production";

      const allowInsecure =
        process.env.PG_SSL_INSECURE === "true" && process.env.NODE_ENV !== "production";

      return sslRequired ? { rejectUnauthorized: !allowInsecure } : false;
    })(),
    max: 1,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Drop everything in public schema (including schema_migrations), then recreate schema.
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");

    await applyMigrations(client);

    await client.query("COMMIT");
    console.log("DB reset complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DB reset failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

await main();

