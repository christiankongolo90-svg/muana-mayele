import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../_lib/cors';
import { successResponse, errorResponse } from '../../_lib/response';
import { getPool } from '../../_lib/db';
import { authenticateAdmin } from '../../_lib/admin-auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'DELETE') return errorResponse(res, 'Method not allowed', 405);

  try {
    const pool = getPool();
    if (!(await authenticateAdmin(req, res))) return;

    const { id } = req.body || {};
    if (!id) return errorResponse(res, 'Session ID is required');

    await pool.query('DELETE FROM quiz_sessions WHERE id = $1', [id]);
    return successResponse(res, null, 'Session deleted');
  } catch (err: any) {
    return errorResponse(res, 'Failed to delete session', 500);
  }
}
