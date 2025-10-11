import { setCors } from './_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  return res.json({ success: true, message: 'ok', data: { timestamp: new Date().toISOString() } });
}