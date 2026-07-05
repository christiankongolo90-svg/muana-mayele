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

    const { id, ...data } = req.body || {};
    if (!id) return errorResponse(res, 'User ID is required');

    const allowed = ['full_name', 'email', 'phone', 'country_code', 'profession', 'neighborhood', 'role'];
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const field of allowed) {
      if (data[field] !== undefined) {
        sets.push(`${field} = $${idx++}`);
        params.push(data[field]);
      }
    }
    if (sets.length === 0) return errorResponse(res, 'No fields to update');

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params
    );
    if (rows.length === 0) return errorResponse(res, 'User not found', 404);

    return successResponse(res, { user: rows[0] });
  } catch (err: any) {
    return errorResponse(res, 'Failed to update user', 500);
  }
}
