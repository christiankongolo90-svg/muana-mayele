import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors';
import { successResponse, errorResponse } from '../_lib/response';
import { getPool } from '../_lib/db';
import { getAccessStatus } from '../_lib/settings';
import { POINTS_PER_CORRECT, QUIZ_TOTAL_QUESTIONS } from '../_lib/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return errorResponse(res, 'Method not allowed', 405);

  const { user_id } = req.body || {};
  if (!user_id) return errorResponse(res, 'User ID is required');

  const userId = Number(user_id);

  try {
    const pool = getPool();

    // Check if quiz is open
    const access = await getAccessStatus(pool);
    if (!access.is_open) {
      let message = 'Le quiz est actuellement fermé. Revenez plus tard.';
      if (access.schedule?.next_session) {
        const ns = access.schedule.next_session;
        const dayNames = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
        const dayName = dayNames[ns.day_of_week] || '';
        const start = ns.start?.slice(0, 5) || '';
        const end = ns.end?.slice(0, 5) || '';
        message = `Le quiz n'est pas encore ouvert. Prochaine session : ${dayName} de ${start} à ${end}.`;
      }
      return errorResponse(res, message, 403);
    }

    // Verify user exists
    const userRes = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return errorResponse(res, 'User not found', 404);

    // Check if user already took quiz during this window
    let windowStart: string;
    if (access.schedule?.enabled) {
      // Use schedule start time today in the configured timezone
      const tz = access.schedule.timezone || 'Africa/Kinshasa';
      const nowStr = new Date().toLocaleString('en-US', { timeZone: tz });
      const nowLocal = new Date(nowStr);
      const [h, m] = (access.schedule.start_time || '00:00').split(':').map(Number);
      nowLocal.setHours(h, m, 0, 0);
      windowStart = nowLocal.toISOString();
    } else {
      // Manual mode: midnight today in Kinshasa
      const nowStr = new Date().toLocaleString('en-US', { timeZone: 'Africa/Kinshasa' });
      const nowLocal = new Date(nowStr);
      nowLocal.setHours(0, 0, 0, 0);
      windowStart = nowLocal.toISOString();
    }

    const existing = await pool.query(
      'SELECT id FROM quiz_sessions WHERE user_id = $1 AND started_at >= $2 LIMIT 1',
      [userId, windowStart]
    );
    if (existing.rows.length > 0) {
      return errorResponse(res, 'Vous avez déjà participé au quiz durant cette session. Revenez à la prochaine session !', 429);
    }

    // Get previously answered question IDs
    const prevRes = await pool.query(
      `SELECT DISTINCT qa.question_id FROM quiz_answers qa
       JOIN quiz_sessions qs ON qa.session_id = qs.id
       WHERE qs.user_id = $1`,
      [userId]
    );
    const excludeIds = prevRes.rows.map(r => r.question_id);

    // Check if enough unseen questions available
    let excludeClause = '';
    let excludeParams: any[] = [];
    if (excludeIds.length > 0) {
      const countRes = await pool.query(
        'SELECT COUNT(*) as c FROM questions WHERE is_active = TRUE AND id != ALL($1::int[])',
        [excludeIds]
      );
      if (Number(countRes.rows[0].c) < QUIZ_TOTAL_QUESTIONS) {
        // Not enough unseen — allow all
        excludeIds.length = 0;
      }
    }

    if (excludeIds.length > 0) {
      excludeClause = ' AND q.id != ALL($3::int[])';
    }

    // Select questions weighted by difficulty: 20% easy, 40% medium, 40% hard
    const easyCount = Math.max(1, Math.round(QUIZ_TOTAL_QUESTIONS * 0.2));
    const mediumCount = Math.max(1, Math.round(QUIZ_TOTAL_QUESTIONS * 0.4));
    const hardCount = QUIZ_TOTAL_QUESTIONS - easyCount - mediumCount;

    const allQuestions: any[] = [];
    for (const [diff, count] of [['easy', easyCount], ['medium', mediumCount], ['hard', hardCount]] as const) {
      const params: any[] = [diff, count];
      let q = `SELECT q.id, q.question, q.options, q.correct_answer, q.difficulty, c.name as category
               FROM questions q JOIN categories c ON q.category_id = c.id
               WHERE q.is_active = TRUE AND q.difficulty = $1`;
      if (excludeIds.length > 0) {
        q += ' AND q.id != ALL($3::int[])';
        params.push(excludeIds);
      }
      q += ' ORDER BY RANDOM() LIMIT $2';
      const { rows } = await pool.query(q, params);
      allQuestions.push(...rows);
    }

    // Fill up if not enough
    if (allQuestions.length < QUIZ_TOTAL_QUESTIONS) {
      const gotIds = allQuestions.map(q => q.id);
      const allExclude = [...excludeIds, ...gotIds];
      const remaining = QUIZ_TOTAL_QUESTIONS - allQuestions.length;
      const params: any[] = [remaining];
      let q = `SELECT q.id, q.question, q.options, q.correct_answer, q.difficulty, c.name as category
               FROM questions q JOIN categories c ON q.category_id = c.id
               WHERE q.is_active = TRUE`;
      if (allExclude.length > 0) {
        q += ' AND q.id != ALL($2::int[])';
        params.push(allExclude);
      }
      q += ' ORDER BY RANDOM() LIMIT $1';
      const { rows } = await pool.query(q, params);
      allQuestions.push(...rows);
    }

    // Shuffle
    for (let i = allQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
    }

    if (allQuestions.length === 0) return errorResponse(res, 'No questions available', 500);

    // Create session
    const sessionRes = await pool.query(
      'INSERT INTO quiz_sessions (user_id, total_questions) VALUES ($1, $2) RETURNING id',
      [userId, allQuestions.length]
    );
    const sessionId = sessionRes.rows[0].id;

    // Return questions without correct answers
    const safeQuestions = allQuestions.map(q => ({
      id: q.id,
      question: q.question,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      category: q.category,
      difficulty: q.difficulty,
    }));

    return successResponse(res, {
      session_id: sessionId,
      questions: safeQuestions,
      total_questions: safeQuestions.length,
      time_limit: access.settings.time_limit,
      points_per_correct: POINTS_PER_CORRECT,
    });
  } catch (err: any) {
    console.error('Quiz start error:', err.message);
    return errorResponse(res, 'Failed to start quiz', 500);
  }
}
