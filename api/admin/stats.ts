import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors';
import { successResponse, errorResponse } from '../_lib/response';
import { getPool } from '../_lib/db';
import { authenticateAdmin } from '../_lib/admin-auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return errorResponse(res, 'Method not allowed', 405);

  try {
    const pool = getPool();
    if (!(await authenticateAdmin(req, res))) return;

    const [users, questions, sessions, completed, avg, recentUsers, recentSessions] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users'),
      pool.query('SELECT COUNT(*) as total FROM questions'),
      pool.query('SELECT COUNT(*) as total FROM quiz_sessions'),
      pool.query('SELECT COUNT(*) as total FROM quiz_sessions WHERE is_completed = TRUE'),
      pool.query('SELECT AVG(total_points) as avg FROM quiz_sessions WHERE is_completed = TRUE'),
      pool.query('SELECT id, full_name, phone, country_code, role FROM users ORDER BY id DESC LIMIT 5'),
      pool.query(`SELECT qs.id, qs.total_points, qs.correct_answers, qs.total_questions, qs.started_at, u.full_name
                  FROM quiz_sessions qs JOIN users u ON qs.user_id = u.id
                  WHERE qs.is_completed = TRUE ORDER BY qs.ended_at DESC LIMIT 5`),
    ]);

    return successResponse(res, {
      totalUsers: Number(users.rows[0].total),
      totalQuestions: Number(questions.rows[0].total),
      totalSessions: Number(sessions.rows[0].total),
      completedSessions: Number(completed.rows[0].total),
      averageScore: Math.round(Number(avg.rows[0].avg || 0) * 10) / 10,
      recentUsers: recentUsers.rows,
      recentSessions: recentSessions.rows,
    });
  } catch (err: any) {
    console.error('Admin stats error:', err.message);
    return errorResponse(res, 'Failed to fetch stats', 500);
  }
}
