import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../_lib/cors';
import { successResponse, errorResponse } from '../../_lib/response';
import { getPool } from '../../_lib/db';
import { authenticateAdmin } from '../../_lib/admin-auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'PUT') return errorResponse(res, 'Method not allowed', 405);

  try {
    const pool = getPool();
    if (!(await authenticateAdmin(req, res))) return;

    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) return errorResponse(res, 'Items array is required');

    let updated = 0;
    for (const item of items) {
      if (!item.id || item.value === undefined) continue;
      await pool.query('UPDATE site_content SET content_value = $1 WHERE id = $2', [item.value, item.id]);
      updated++;
    }

    const { rows } = await pool.query('SELECT * FROM site_content ORDER BY section, sort_order');
    return successResponse(res, { content: rows, updated });
  } catch (err: any) {
    return errorResponse(res, 'Failed to update site content', 500);
  }
}
