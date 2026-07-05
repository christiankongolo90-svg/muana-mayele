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

    const id = req.query["id"];
    if (!id) return errorResponse(res, 'Session ID is required');

    const sessRes = await pool.query(
      'SELECT qs.*, u.full_name FROM quiz_sessions qs JOIN users u ON qs.user_id = u.id WHERE qs.id = $1', [id]
    );
    if (sessRes.rows.length === 0) return errorResponse(res, 'Session not found', 404);

    const ansRes = await pool.query(`
      SELECT qa.*, q.question, q.options, q.correct_answer, c.name as category
      FROM quiz_answers qa JOIN questions q ON qa.question_id = q.id
      JOIN categories c ON q.category_id = c.id
      WHERE qa.session_id = $1 ORDER BY qa.id
    `, [id]);

    return successResponse(res, {
      session: sessRes.rows[0],
      answers: ansRes.rows.map((a: any) => ({
        ...a, options: typeof a.options === 'string' ? JSON.parse(a.options) : a.options,
      })),
    });
  } catch (err: any) {
    return errorResponse(res, 'Failed to fetch session', 500);
  }
}
