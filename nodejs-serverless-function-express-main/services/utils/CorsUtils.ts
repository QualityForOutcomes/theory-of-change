import type { VercelRequest, VercelResponse } from '@vercel/node';

export class CorsUtils {
  static setCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  static handleOptions(req: VercelRequest, res: VercelResponse): boolean {
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return true;
    }
    return false;
  }
}