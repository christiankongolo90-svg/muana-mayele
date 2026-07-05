import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env["SUPABASE_DB_URL"],
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
  }
  return pool;
}
