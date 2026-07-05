import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const dbUrl = process.env["SUPABASE_DB_URL"] || process.env["POSTGRES_URL"] || 'NOT SET';

    // Try importing pg
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env["SUPABASE_DB_URL"] || process.env["POSTGRES_URL"],
      ssl: { rejectUnauthorized: false },
      max: 1,
    });

    const { rows } = await pool.query('SELECT NOW() as time, current_database() as db');
    await pool.end();

    return res.status(200).json({
      status: 'ok',
      db_url_source: process.env["SUPABASE_DB_URL"] ? 'SUPABASE_DB_URL' : (process.env["POSTGRES_URL"] ? 'POSTGRES_URL' : 'NONE'),
      db_url_preview: dbUrl.slice(0, 30) + '...',
      db_result: rows[0],
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 5),
    });
  }
}
