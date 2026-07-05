import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors';
import { successResponse, errorResponse } from '../_lib/response';
import { getPool } from '../_lib/db';
import { getAccessStatus } from '../_lib/settings';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return errorResponse(res, 'Method not allowed', 405);

  try {
    const pool = getPool();
    const access = await getAccessStatus(pool);

    return successResponse(res, {
      is_open: access.is_open,
      time_limit: access.settings.time_limit,
      schedule: access.schedule,
    });
  } catch (err: any) {
    console.error('Quiz settings error:', err.message, err.stack);
    return errorResponse(res, 'Failed to fetch quiz settings: ' + err.message, 500);
  }
}
