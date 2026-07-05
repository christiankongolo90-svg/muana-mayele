import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors';
import { successResponse, errorResponse } from '../_lib/response';
import { getPool } from '../_lib/db';
import { authenticateAdmin } from '../_lib/admin-auth';
import { getSettings } from '../_lib/settings';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'PUT') return errorResponse(res, 'Method not allowed', 405);

  try {
    const pool = getPool();
    if (!(await authenticateAdmin(req, res))) return;

    const data = req.body || {};
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.time_limit != null) {
      const tl = Number(data.time_limit);
      if (tl < 60 || tl > 7200) return errorResponse(res, 'Time limit must be between 60 and 7200');
      sets.push(`time_limit = $${idx++}`); params.push(tl);
    }
    if (data.is_open != null) { sets.push(`is_open = $${idx++}`); params.push(Boolean(data.is_open)); }
    if (data.schedule_enabled != null) { sets.push(`schedule_enabled = $${idx++}`); params.push(Boolean(data.schedule_enabled)); }
    if (data.schedule_days !== undefined) {
      if (Array.isArray(data.schedule_days)) {
        sets.push(`schedule_days = $${idx++}`); params.push(JSON.stringify(data.schedule_days.map(Number)));
      } else {
        sets.push(`schedule_days = NULL`);
      }
    }
    if (data.schedule_start_time !== undefined) {
      if (data.schedule_start_time) { sets.push(`schedule_start_time = $${idx++}`); params.push(data.schedule_start_time); }
      else { sets.push(`schedule_start_time = NULL`); }
    }
    if (data.schedule_end_time !== undefined) {
      if (data.schedule_end_time) { sets.push(`schedule_end_time = $${idx++}`); params.push(data.schedule_end_time); }
      else { sets.push(`schedule_end_time = NULL`); }
    }
    if (data.schedule_timezone) { sets.push(`schedule_timezone = $${idx++}`); params.push(data.schedule_timezone); }

    if (sets.length === 0) return errorResponse(res, 'No valid fields to update');

    await pool.query(`UPDATE quiz_settings SET ${sets.join(', ')} WHERE id = 1`, params);
    const settings = await getSettings(pool);
    return successResponse(res, { settings });
  } catch (err: any) {
    console.error('Settings update error:', err.message);
    return errorResponse(res, 'Failed to update settings', 500);
  }
}
