import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors';
import { successResponse, errorResponse } from '../_lib/response';
import { getPool } from '../_lib/db';
import { authenticateAdmin } from '../_lib/admin-auth';
import { getSettings } from '../_lib/settings';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return errorResponse(res, 'Method not allowed', 405);

  try {
    const pool = getPool();
    if (!(await authenticateAdmin(req, res))) return;
    const settings = await getSettings(pool);
    return successResponse(res, { settings });
  } catch (err: any) {
    console.error('Admin settings error:', err.message);
    return errorResponse(res, 'Failed to fetch settings', 500);
  }
}
