import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors';
import { successResponse, errorResponse } from '../_lib/response';
import { getPool } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return errorResponse(res, 'Method not allowed', 405);

  const sessionId = req.query.session_id;
  if (!sessionId) return errorResponse(res, 'Session ID is required');

  try {
    const pool = getPool();

    const rRes = await pool.query(
      `SELECT qs.*, u.full_name FROM quiz_sessions qs JOIN users u ON qs.user_id = u.id WHERE qs.id = $1`,
      [sessionId]
    );
    if (rRes.rows.length === 0) return errorResponse(res, 'Session not found', 404);
    const r = rRes.rows[0];
    if (!r.is_completed) return errorResponse(res, 'Quiz not yet completed');

    const aRes = await pool.query(
      `SELECT qa.question_id, qa.selected_answer, qa.is_correct,
              q.question, q.options, q.correct_answer, c.name as category
       FROM quiz_answers qa
       JOIN questions q ON qa.question_id = q.id
       JOIN categories c ON q.category_id = c.id
       WHERE qa.session_id = $1 ORDER BY qa.id`,
      [sessionId]
    );

    return successResponse(res, {
      results: {
        session_id: r.id, user_name: r.full_name,
        total_questions: Number(r.total_questions), correct_answers: Number(r.correct_answers),
        wrong_answers: Number(r.wrong_answers), score: Number(r.score),
        total_points: Number(r.total_points), percentage: Number(r.percentage),
        time_taken: Number(r.time_taken), started_at: r.started_at, ended_at: r.ended_at,
      },
      answers: aRes.rows.map((a: any) => ({
        ...a, options: typeof a.options === 'string' ? JSON.parse(a.options) : a.options,
      })),
    });
  } catch (err: any) {
    console.error('Results error:', err.message);
    return errorResponse(res, 'Failed to fetch results', 500);
  }
}
