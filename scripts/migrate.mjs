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

async function main() {
  // Load local env files for developer convenience.
  // Next.js automatically loads .env.local, but plain Node scripts do not.
  dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });
  dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    console.error("Missing DATABASE_URL (or POSTGRESQLCONNSTR_DATABASE_URL).");
    process.exit(1);
  }

  const migrationsDir = path.resolve(__dirname, "..", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+_.*\.sql$/i.test(f))
    .sort((a, b) => a.localeCompare(b));

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

    // Ensure schema_migrations exists (in case someone runs an older DB)
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
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [
        filename,
      ]);
    }

    await client.query("COMMIT");
    console.log("Migrations complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

await main();

