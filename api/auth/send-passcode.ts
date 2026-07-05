import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors';
import { successResponse, errorResponse } from '../_lib/response';
import { getPool } from '../_lib/db';
import { sendOtp } from '../_lib/muinda-otp';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return errorResponse(res, 'Method not allowed', 405);

  const { phone: rawPhone, country_code, type = 'login', full_name, email, profession, neighborhood } = req.body || {};

  if (!rawPhone?.trim()) return errorResponse(res, 'Le numéro de téléphone est obligatoire');
  if (!country_code?.trim()) return errorResponse(res, 'Le code pays est obligatoire');

  const phone = rawPhone.replace(/[^0-9]/g, '');
  if (phone.length < 8 || phone.length > 15) return errorResponse(res, 'Numéro de téléphone invalide');

  try {
    const pool = getPool();

    const { rows } = await pool.query(
      'SELECT id FROM users WHERE country_code = $1 AND phone = $2',
      [country_code.trim(), phone]
    );
    const existingUser = rows[0] || null;

    if (type === 'register') {
      if (existingUser) return errorResponse(res, 'Ce numéro est déjà enregistré. Veuillez vous connecter.');
      if (!full_name?.trim()) return errorResponse(res, "Le nom complet est obligatoire pour l'inscription");
    } else {
      if (!existingUser) return errorResponse(res, 'Aucun compte trouvé avec ce numéro. Veuillez vous inscrire.');
    }

    const result = await sendOtp(country_code.trim(), phone);

    if (!result.success) {
      console.error('Muinda OTP send failed:', JSON.stringify(result));
      if (result.status === 429) return errorResponse(res, 'Veuillez patienter avant de demander un nouveau code', 429);
      return errorResponse(res, "Erreur lors de l'envoi du code", 500);
    }

    let expiresIn = 300;
    if (result.data?.expiresAt) {
      const ts = new Date(result.data.expiresAt).getTime();
      if (!isNaN(ts)) expiresIn = Math.max(60, Math.floor((ts - Date.now()) / 1000));
    }

    return successResponse(res, {
      message: 'Code envoyé par WhatsApp',
      phone, country_code: country_code.trim(), type, expires_in: expiresIn,
    }, 'Code envoyé avec succès!');
  } catch (err: any) {
    console.error('Send passcode error:', err.message);
    return errorResponse(res, "Erreur lors de l'envoi du code", 500);
  }
}
