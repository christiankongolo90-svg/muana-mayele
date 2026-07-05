import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors';
import { successResponse, errorResponse } from '../_lib/response';
import { getPool } from '../_lib/db';
import { verifyOtp } from '../_lib/muinda-otp';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return errorResponse(res, 'Method not allowed', 405);

  const { phone: rawPhone, country_code, passcode, full_name, email, profession, neighborhood } = req.body || {};

  if (!rawPhone?.trim()) return errorResponse(res, 'Le numéro de téléphone est obligatoire');
  if (!country_code?.trim()) return errorResponse(res, 'Le code pays est obligatoire');
  if (!passcode?.trim()) return errorResponse(res, 'Le code de vérification est obligatoire');

  const phone = rawPhone.replace(/[^0-9]/g, '');
  const cc = country_code.trim();

  try {
    const verifyResult = await verifyOtp(cc, phone, passcode.trim());
    if (!verifyResult.success) return errorResponse(res, 'Code invalide ou expiré');

    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, full_name, email, phone, country_code, neighborhood, role FROM users WHERE country_code = $1 AND phone = $2',
      [cc, phone]
    );

    if (rows.length === 0) {
      if (!full_name?.trim()) return errorResponse(res, "Le nom complet est obligatoire pour l'inscription");

      const insert = await pool.query(
        `INSERT INTO users (full_name, email, phone, country_code, profession, neighborhood)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, email, phone, country_code, neighborhood, role`,
        [full_name.trim(), email?.trim() || null, phone, cc, profession?.trim() || null, neighborhood?.trim() || null]
      );

      return successResponse(res, { user: insert.rows[0], is_new: true }, 'Compte créé avec succès!');
    }

    return successResponse(res, { user: rows[0], is_new: false }, 'Connexion réussie!');
  } catch (err: any) {
    console.error('Verify passcode error:', err.message);
    return errorResponse(res, 'Erreur lors de la vérification', 500);
  }
}
