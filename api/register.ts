import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_lib/cors';
import { successResponse, errorResponse } from './_lib/response';
import { getPool } from './_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return errorResponse(res, 'Method not allowed', 405);

  const { full_name, phone, country_code = '+243', email, profession, neighborhood } = req.body || {};
  if (!full_name?.trim()) return errorResponse(res, 'Le nom complet est obligatoire');
  if (!phone?.trim()) return errorResponse(res, 'Le numéro de téléphone est obligatoire');

  const cleanPhone = phone.replace(/[^0-9]/g, '');

  try {
    const pool = getPool();

    const existing = await pool.query('SELECT id FROM users WHERE country_code = $1 AND phone = $2', [country_code, cleanPhone]);
    if (existing.rows.length > 0) return errorResponse(res, 'Ce numéro est déjà enregistré');

    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, phone, country_code, profession, neighborhood)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, email, phone, country_code, neighborhood, role`,
      [full_name.trim(), email?.trim() || null, cleanPhone, country_code, profession?.trim() || null, neighborhood?.trim() || null]
    );

    return successResponse(res, { user: rows[0] }, 'Inscription réussie!');
  } catch (err: any) {
    console.error('Register error:', err.message);
    return errorResponse(res, "Erreur lors de l'inscription", 500);
  }
}
