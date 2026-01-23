import { Pool } from 'pg';

let pool: Pool | null = null;

function getDatabaseUrl(): string | undefined {
  // Preferred: standard env var used by this app
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Azure App Service "Connection strings" (PostgreSQL) commonly surfaces as POSTGRESQLCONNSTR_<NAME>.
  // If someone created a connection string named DATABASE_URL, Azure exposes it as POSTGRESQLCONNSTR_DATABASE_URL.
  if (process.env.POSTGRESQLCONNSTR_DATABASE_URL) return process.env.POSTGRESQLCONNSTR_DATABASE_URL;

  return undefined;
}

export function getPool(): Pool {
  if (!pool) {
    const connectionString = getDatabaseUrl();
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Cloud Postgres providers typically require SSL.
    const isSupabase = connectionString.includes('supabase.co') || connectionString.includes('pooler.supabase.com');
    const isAzurePostgres = connectionString.includes('.postgres.database.azure.com');
    const requiresSslFromUrl =
      /[?&]sslmode=(require|verify-ca|verify-full)(?:&|$)/i.test(connectionString);
    const sslRequired =
      isSupabase || isAzurePostgres || requiresSslFromUrl || process.env.NODE_ENV === "production";

    // Secure by default: verify certificates.
    // Break-glass option for dev/stage only if needed.
    const allowInsecure =
      process.env.PG_SSL_INSECURE === "true" && process.env.NODE_ENV !== "production";

    const sslConfig = sslRequired ? { rejectUnauthorized: !allowInsecure } : false;

    pool = new Pool({
      connectionString,
      ssl: sslConfig,
      connectionTimeoutMillis: 10000, // 10 seconds
      idleTimeoutMillis: 30000,
      max: 10,
    });
  }

  return pool;
}

// Test database connection
export type DbTestResult =
  | { ok: true }
  | {
      ok: false
      error: {
        name?: string
        code?: string
        errno?: string
        syscall?: string
        message?: string
      }
    }

export async function testDatabaseConnection(): Promise<DbTestResult> {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT NOW()');
    console.log('Database connected successfully:', result.rows[0]);
    return { ok: true };
  } catch (error: any) {
    console.error('Database connection error:', error);
    return {
      ok: false,
      error: {
        name: error?.name,
        code: error?.code,
        errno: error?.errno,
        syscall: error?.syscall,
        // Message can include hostnames, but should not include passwords.
        message: error?.message,
      },
    };
  }
}

// Initialize database with a simple test table
export async function initializeDatabase(): Promise<void> {
  try {
    const pool = getPool();
    
    // Create a simple test table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert a test record if table is empty
    const checkResult = await pool.query('SELECT COUNT(*) FROM test_table');
    if (parseInt(checkResult.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO test_table (message) VALUES ('Database connection successful!')
      `);
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}