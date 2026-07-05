import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool } from './db';
import { errorResponse } from './response';

export async function authenticateAdmin(req: VercelRequest, res: VercelResponse): Promise<any | null> {
  const adminId =
    req.headers['x-admin-user-id'] as string ||
    (req.query.admin_user_id as string) ||
    req.body?.admin_user_id;

  if (!adminId) {
    errorResponse(res, 'Authentication required', 401);
    return null;
  }

  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT id, full_name, role FROM users WHERE id = $1',
    [adminId]
  );

  if (rows.length === 0) {
    errorResponse(res, 'User not found', 401);
    return null;
  }

  if (rows[0].role !== 'admin') {
    errorResponse(res, 'Admin access required', 403);
    return null;
  }

  return rows[0];
}
