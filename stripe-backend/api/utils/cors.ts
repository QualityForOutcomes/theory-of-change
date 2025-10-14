import type { VercelRequest, VercelResponse } from '@vercel/node';

export function setCORSHeaders(res: VercelResponse, req: VercelRequest): void {
  const origin = req.headers.origin;
  
  // Get allowed origins from environment
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 
    'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:5173,http://localhost:5174,http://localhost:5175')
    .split(',')
    .map(o => o.trim());

  // Check if origin is allowed
  const isAllowed = !origin || 
    /^http:\/\/localhost(:\d+)?$/.test(origin) ||
    allowedOrigins.includes(origin);

  res.setHeader('Access-Control-Allow-Origin', isAllowed ? (origin || '*') : '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
}

export function handleCORS(req: VercelRequest, res: VercelResponse): boolean {
  setCORSHeaders(res, req);
  
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  
  return false;
}