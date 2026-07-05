import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../_lib/cors';
import { successResponse, errorResponse } from '../../_lib/response';
import { getPool } from '../../_lib/db';
import { authenticateAdmin } from '../../_lib/admin-auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return errorResponse(res, 'Method not allowed', 405);

  try {
    const pool = getPool();
    if (!(await authenticateAdmin(req, res))) return;

    const { category_id, question, options, correct_answer, difficulty = 'medium', is_active = true } = req.body || {};
    if (!category_id || !question || !options || correct_answer == null) {
      return errorResponse(res, 'Missing required fields');
    }

    const { rows } = await pool.query(
      `INSERT INTO questions (category_id, question, options, correct_answer, difficulty, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [category_id, question, JSON.stringify(options), correct_answer, difficulty, is_active]
    );

    return successResponse(res, { question: rows[0] }, 'Question created');
  } catch (err: any) {
    return errorResponse(res, 'Failed to create question', 500);
  }
}
