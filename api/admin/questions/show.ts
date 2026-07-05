import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../_lib/cors';
import { successResponse, errorResponse } from '../../_lib/response';
import { getPool } from '../../_lib/db';
import { authenticateAdmin } from '../../_lib/admin-auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return errorResponse(res, 'Method not allowed', 405);

  try {
    const pool = getPool();
    if (!(await authenticateAdmin(req, res))) return;

    const { rows } = await pool.query(
      `SELECT q.*, c.name as category_name FROM questions q
       JOIN categories c ON q.category_id = c.id WHERE q.id = $1`, [req.query["id"]]
    );
    if (rows.length === 0) return errorResponse(res, 'Question not found', 404);

    const q = rows[0];
    q.options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
    return successResponse(res, { question: q });
  } catch (err: any) {
    return errorResponse(res, 'Failed to fetch question', 500);
  }
}
