import type { VercelResponse } from '@vercel/node';

export function successResponse(res: VercelResponse, data: any, message?: string) {
  const body: any = { success: true, data };
  if (message) body.message = message;
  return res.status(200).json(body);
}

export function errorResponse(res: VercelResponse, message: string, statusCode = 400) {
  return res.status(statusCode).json({ success: false, error: message });
}
