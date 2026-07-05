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

    const { rows } = await pool.query(`
      SELECT c.*, COUNT(q.id) as question_count
      FROM categories c LEFT JOIN questions q ON c.id = q.category_id
      GROUP BY c.id ORDER BY c.name
    `);

    return successResponse(res, { categories: rows });
  } catch (err: any) {
    return errorResponse(res, 'Failed to fetch categories', 500);
  }
}
