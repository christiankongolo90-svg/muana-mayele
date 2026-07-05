import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_lib/cors';
import { successResponse, errorResponse } from './_lib/response';
import { getPool } from './_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return errorResponse(res, 'Method not allowed', 405);

  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM site_content ORDER BY section, sort_order');
    return successResponse(res, { content: rows });
  } catch (err: any) {
    console.error('Site content error:', err.message);
    return errorResponse(res, 'Failed to fetch site content', 500);
  }
}
