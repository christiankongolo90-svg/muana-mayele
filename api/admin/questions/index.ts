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

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const categoryId = req.query.category_id ? Number(req.query.category_id) : null;
    const search = (req.query.search as string) || '';
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (categoryId) { conditions.push(`q.category_id = $${idx++}`); params.push(categoryId); }
    if (search) { conditions.push(`q.question ILIKE $${idx++}`); params.push(`%${search}%`); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRes = await pool.query(`SELECT COUNT(*) as total FROM questions q ${where}`, params);
    const total = Number(countRes.rows[0].total);

    const qRes = await pool.query(
      `SELECT q.*, c.name as category_name FROM questions q
       JOIN categories c ON q.category_id = c.id ${where}
       ORDER BY q.id DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    return successResponse(res, {
      questions: qRes.rows.map((q: any) => ({
        ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    return errorResponse(res, 'Failed to fetch questions', 500);
  }
}
