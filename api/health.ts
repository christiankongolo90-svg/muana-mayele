import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    nodeVersion: process.version,
    time: new Date().toISOString(),
    env_keys: Object.keys(process.env).filter(k => k.includes('SUPA') || k.includes('POSTGRES') || k.includes('MUINDA')),
  });
}
