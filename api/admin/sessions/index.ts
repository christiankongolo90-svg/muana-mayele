import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../_lib/cors';
import { successResponse, errorResponse } from '../../_lib/response';
import { getPool } from '../../_lib/db';
import { authenticateAdmin } from '../../_lib/admin-auth';
import { POINTS_PER_CORRECT } from '../../_lib/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return errorResponse(res, 'Method not allowed', 405);

  try {
    const pool = getPool();
    if (!(await authenticateAdmin(req, res))) return;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const userId = req.query.user_id ? Number(req.query.user_id) : null;
    const offset = (page - 1) * limit;

    let where = '';
    const params: any[] = [];
    let idx = 1;
    if (userId) { where = `WHERE qs.user_id = $${idx++}`; params.push(userId); }

    const countRes = await pool.query(
      `SELECT COUNT(*) as total FROM quiz_sessions qs ${where.replace('qs.', '')}`, params
    );
    const total = Number(countRes.rows[0].total);

    const { rows } = await pool.query(`
      SELECT qs.*, u.full_name, u.phone,
        (SELECT COUNT(*) FROM quiz_answers qa WHERE qa.session_id = qs.id AND qa.is_correct) as live_correct,
        (SELECT COUNT(*) FROM quiz_answers qa WHERE qa.session_id = qs.id) as live_answered,
        (SELECT COUNT(*) FROM quiz_answers qa WHERE qa.session_id = qs.id AND qa.is_correct) * ${POINTS_PER_CORRECT} as live_points,
        CASE
          WHEN qs.is_completed THEN qs.time_taken
          WHEN (SELECT MAX(qa.answered_at) FROM quiz_answers qa WHERE qa.session_id = qs.id) IS NOT NULL
            THEN EXTRACT(EPOCH FROM ((SELECT MAX(qa.answered_at) FROM quiz_answers qa WHERE qa.session_id = qs.id) - qs.started_at))::int
          ELSE NULL
        END as live_duration
      FROM quiz_sessions qs JOIN users u ON qs.user_id = u.id
      ${where} ORDER BY qs.started_at DESC LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, limit, offset]);

    return successResponse(res, {
      sessions: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error('Admin sessions error:', err.message);
    return errorResponse(res, 'Failed to fetch sessions', 500);
  }
}
