import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_lib/cors';
import { successResponse, errorResponse } from './_lib/response';
import { getPool } from './_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return errorResponse(res, 'Method not allowed', 405);

  try {
    const pool = getPool();
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const { rows } = await pool.query(`
      SELECT q.id, q.question, q.options, q.difficulty, c.name as category
      FROM questions q JOIN categories c ON q.category_id = c.id
      WHERE q.is_active = TRUE ORDER BY RANDOM() LIMIT $1
    `, [limit]);

    return successResponse(res, rows.map((q: any) => ({
      ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    })));
  } catch (err: any) {
    console.error('Questions error:', err.message);
    return errorResponse(res, 'Failed to fetch questions', 500);
  }
}
