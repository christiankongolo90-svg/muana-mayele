import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_lib/cors';
import { successResponse, errorResponse } from './_lib/response';
import { getPool } from './_lib/db';
import { POINTS_PER_CORRECT } from './_lib/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return errorResponse(res, 'Method not allowed', 405);

  const limit = Math.min(Number(req.query.limit) || 10, 100);
  const userId = req.query.user_id ? Number(req.query.user_id) : null;

  try {
    const pool = getPool();

    // Get today in Kinshasa timezone
    const nowStr = new Date().toLocaleString('en-US', { timeZone: 'Africa/Kinshasa' });
    const today = new Date(nowStr).toISOString().slice(0, 10);

    const { rows: leaderboard } = await pool.query(`
      SELECT id, full_name, neighborhood, best_score, total_quizzes, best_time
      FROM (
        SELECT
          u.id, u.full_name, u.neighborhood,
          MAX(COALESCE(qa_scores.session_score, 0)) as best_score,
          COUNT(DISTINCT qs.id) as total_quizzes,
          MIN(CASE WHEN qs.is_completed THEN qs.time_taken ELSE NULL END) as best_time,
          COALESCE(MIN(CASE WHEN qs.is_completed THEN qs.time_taken ELSE NULL END), 999999) as sort_time
        FROM users u
        INNER JOIN quiz_sessions qs ON u.id = qs.user_id
          AND (qs.started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Kinshasa')::date = $1::date
        LEFT JOIN (
          SELECT session_id, COUNT(*) * ${POINTS_PER_CORRECT} as session_score
          FROM quiz_answers WHERE is_correct = TRUE GROUP BY session_id
        ) qa_scores ON qa_scores.session_id = qs.id
        GROUP BY u.id, u.full_name, u.neighborhood
        HAVING COUNT(DISTINCT qs.id) > 0
      ) scores
      ORDER BY best_score DESC, sort_time ASC
      LIMIT $2
    `, [today, limit]);

    const formatted = leaderboard.map((e: any, i: number) => ({
      rank: i + 1,
      user_id: e.id,
      name: e.full_name,
      neighborhood: e.neighborhood,
      best_score: Number(e.best_score),
      total_points: Number(e.best_score),
      total_quizzes: Number(e.total_quizzes),
      best_time: e.best_time != null ? Number(e.best_time) : null,
    }));

    const response: any = { leaderboard: formatted, total: formatted.length };

    if (userId) {
      const { rows: rankRows } = await pool.query(`
        SELECT ranked.rank_pos, ranked.best_score, ranked.best_time
        FROM (
          SELECT id, best_score, best_time,
            ROW_NUMBER() OVER (ORDER BY best_score DESC, sort_time ASC) as rank_pos
          FROM (
            SELECT u.id,
              MAX(COALESCE(qa_scores.session_score, 0)) as best_score,
              MIN(CASE WHEN qs.is_completed THEN qs.time_taken ELSE NULL END) as best_time,
              COALESCE(MIN(CASE WHEN qs.is_completed THEN qs.time_taken ELSE NULL END), 999999) as sort_time
            FROM users u
            INNER JOIN quiz_sessions qs ON u.id = qs.user_id
              AND (qs.started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Kinshasa')::date = $1::date
            LEFT JOIN (
              SELECT session_id, COUNT(*) * ${POINTS_PER_CORRECT} as session_score
              FROM quiz_answers WHERE is_correct = TRUE GROUP BY session_id
            ) qa_scores ON qa_scores.session_id = qs.id
            GROUP BY u.id
            HAVING COUNT(DISTINCT qs.id) > 0
          ) scores
        ) ranked
        WHERE ranked.id = $2
      `, [today, userId]);

      if (rankRows.length > 0) {
        response.user_rank = {
          rank: Number(rankRows[0].rank_pos),
          best_score: Number(rankRows[0].best_score),
          best_time: rankRows[0].best_time != null ? Number(rankRows[0].best_time) : null,
        };
      }
    }

    return successResponse(res, response);
  } catch (err: any) {
    console.error('Leaderboard error:', err.message);
    return errorResponse(res, 'Failed to fetch leaderboard', 500);
  }
}
