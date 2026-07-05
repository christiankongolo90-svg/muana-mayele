import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors';
import { successResponse, errorResponse } from '../_lib/response';
import { getPool } from '../_lib/db';
import { POINTS_PER_CORRECT } from '../_lib/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return errorResponse(res, 'Method not allowed', 405);

  const { session_id, time_taken = 0 } = req.body || {};
  if (!session_id) return errorResponse(res, 'Session ID is required');

  try {
    const pool = getPool();

    const sessRes = await pool.query('SELECT id, is_completed FROM quiz_sessions WHERE id = $1', [session_id]);
    if (sessRes.rows.length === 0) return errorResponse(res, 'Session not found', 404);

    if (sessRes.rows[0].is_completed) {
      // Already completed — return existing results
      return returnResults(pool, res, session_id);
    }

    // Calculate results from answers
    const calcRes = await pool.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct
       FROM quiz_answers WHERE session_id = $1`,
      [session_id]
    );
    const total = Number(calcRes.rows[0].total);
    const correct = Number(calcRes.rows[0].correct || 0);
    const wrong = total - correct;
    const points = correct * POINTS_PER_CORRECT;
    const percentage = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

    // Update session
    await pool.query(
      `UPDATE quiz_sessions SET ended_at = NOW(), time_taken = $1, correct_answers = $2,
       wrong_answers = $3, score = $2, total_points = $4, percentage = $5, is_completed = TRUE
       WHERE id = $6`,
      [time_taken, correct, wrong, points, percentage, session_id]
    );

    return returnResults(pool, res, session_id);
  } catch (err: any) {
    console.error('Quiz complete error:', err.message);
    return errorResponse(res, 'Failed to complete quiz', 500);
  }
}

async function returnResults(pool: any, res: VercelResponse, sessionId: number) {
  const rRes = await pool.query(
    `SELECT qs.*, u.full_name FROM quiz_sessions qs JOIN users u ON qs.user_id = u.id WHERE qs.id = $1`,
    [sessionId]
  );
  const r = rRes.rows[0];

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
      session_id: r.id, total_questions: Number(r.total_questions),
      correct_answers: Number(r.correct_answers), wrong_answers: Number(r.wrong_answers),
      score: Number(r.score), total_points: Number(r.total_points),
      percentage: Number(r.percentage), time_taken: Number(r.time_taken),
    },
    answers: aRes.rows.map((a: any) => ({
      ...a, options: typeof a.options === 'string' ? JSON.parse(a.options) : a.options,
    })),
  }, 'Quiz completed!');
}
