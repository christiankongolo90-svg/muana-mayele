import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../_lib/cors';
import { successResponse, errorResponse } from '../../_lib/response';
import { getPool } from '../../_lib/db';
import { authenticateAdmin } from '../../_lib/admin-auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'PUT') return errorResponse(res, 'Method not allowed', 405);

  try {
    const pool = getPool();
    if (!(await authenticateAdmin(req, res))) return;

    const { id, name, description } = req.body || {};
    if (!id) return errorResponse(res, 'Category ID is required');

    const { rows } = await pool.query(
      'UPDATE categories SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
      [name?.trim() || null, description?.trim() || null, id]
    );
    if (rows.length === 0) return errorResponse(res, 'Category not found', 404);

    return successResponse(res, { category: rows[0] });
  } catch (err: any) {
    return errorResponse(res, 'Failed to update category', 500);
  }
}
