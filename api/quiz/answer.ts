import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors';
import { successResponse, errorResponse } from '../_lib/response';
import { getPool } from '../_lib/db';
import { POINTS_PER_CORRECT } from '../_lib/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return errorResponse(res, 'Method not allowed', 405);

  const { session_id, question_id, selected_answer } = req.body || {};
  if (session_id == null || question_id == null || selected_answer == null) {
    return errorResponse(res, 'Missing required fields: session_id, question_id, selected_answer');
  }

  try {
    const pool = getPool();

    // Verify session
    const sessRes = await pool.query('SELECT id, is_completed FROM quiz_sessions WHERE id = $1', [session_id]);
    if (sessRes.rows.length === 0) return errorResponse(res, 'Session not found', 404);
    if (sessRes.rows[0].is_completed) return errorResponse(res, 'Quiz already completed');

    // Get question
    const qRes = await pool.query('SELECT correct_answer FROM questions WHERE id = $1', [question_id]);
    if (qRes.rows.length === 0) return errorResponse(res, 'Question not found', 404);

    const isCorrect = Number(selected_answer) === Number(qRes.rows[0].correct_answer);

    // Save answer
    await pool.query(
      'INSERT INTO quiz_answers (session_id, question_id, selected_answer, is_correct) VALUES ($1, $2, $3, $4)',
      [session_id, question_id, selected_answer, isCorrect]
    );

    return successResponse(res, {
      is_correct: isCorrect,
      correct_answer: Number(qRes.rows[0].correct_answer),
      points_earned: isCorrect ? POINTS_PER_CORRECT : 0,
    });
  } catch (err: any) {
    console.error('Answer submission error:', err.message);
    return errorResponse(res, 'Failed to submit answer', 500);
  }
}
