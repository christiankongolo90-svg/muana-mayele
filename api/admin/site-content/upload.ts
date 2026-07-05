import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../_lib/cors';
import { successResponse, errorResponse } from '../../_lib/response';
import { getPool } from '../../_lib/db';
import { authenticateAdmin } from '../../_lib/admin-auth';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return errorResponse(res, 'Method not allowed', 405);

  try {
    const pool = getPool();

    // Auth from header (can't read body yet for admin_user_id)
    const adminId = req.headers['x-admin-user-id'] as string;
    if (!adminId) return errorResponse(res, 'Authentication required', 401);
    const { rows: adminRows } = await pool.query('SELECT id, role FROM users WHERE id = $1', [adminId]);
    if (adminRows.length === 0 || adminRows[0].role !== 'admin') return errorResponse(res, 'Admin access required', 403);

    // Parse multipart form data manually
    const chunks: Buffer[] = [];
    for await (const chunk of req as any) { chunks.push(chunk); }
    const body = Buffer.concat(chunks);

    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) return errorResponse(res, 'Invalid multipart request');

    const boundary = boundaryMatch[1];
    const parts = body.toString('binary').split(`--${boundary}`);

    let fileBuffer: Buffer | null = null;
    let filename = 'upload.png';
    let mimeType = 'image/png';
    let contentId = '';

    for (const part of parts) {
      if (part.includes('name="id"')) {
        const value = part.split('\r\n\r\n')[1]?.trim().replace(/\r\n--$/, '');
        if (value) contentId = value;
      }
      if (part.includes('name="image"')) {
        const filenameMatch = part.match(/filename="(.+?)"/);
        if (filenameMatch) filename = filenameMatch[1];
        const mimeMatch = part.match(/Content-Type: (.+)/);
        if (mimeMatch) mimeType = mimeMatch[1].trim();

        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd >= 0) {
          const fileData = part.slice(headerEnd + 4).replace(/\r\n--$/, '');
          fileBuffer = Buffer.from(fileData, 'binary');
        }
      }
    }

    if (!fileBuffer || !contentId) return errorResponse(res, 'Image and content ID required');

    // Upload to Supabase Storage
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) return errorResponse(res, 'Storage not configured', 500);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const ext = filename.split('.').pop() || 'png';
    const storagePath = `content_${contentId}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('site-content')
      .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return errorResponse(res, 'Failed to upload image', 500);
    }

    const { data: urlData } = supabase.storage.from('site-content').getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Update database
    await pool.query('UPDATE site_content SET content_value = $1 WHERE id = $2', [publicUrl, contentId]);

    const { rows } = await pool.query('SELECT * FROM site_content WHERE id = $1', [contentId]);
    return successResponse(res, { item: rows[0], path: publicUrl });
  } catch (err: any) {
    console.error('Upload error:', err.message);
    return errorResponse(res, 'Failed to upload image', 500);
  }
}
