import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../_lib/cors';
import { successResponse, errorResponse } from '../../_lib/response';
import { getPool } from '../../_lib/db';
import { authenticateAdmin } from '../../_lib/admin-auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return errorResponse(res, 'Method not allowed', 405);

  try {
    const pool = getPool();
    if (!(await authenticateAdmin(req, res))) return;

    const { name, description } = req.body || {};
    if (!name?.trim()) return errorResponse(res, 'Category name is required');

    const { rows } = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name.trim(), description?.trim() || null]
    );
    return successResponse(res, { category: rows[0] }, 'Category created');
  } catch (err: any) {
    if (err.code === '23505') return errorResponse(res, 'Category already exists');
    return errorResponse(res, 'Failed to create category', 500);
  }
}
