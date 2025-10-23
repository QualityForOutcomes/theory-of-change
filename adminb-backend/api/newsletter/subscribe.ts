import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../../lib/cors';
import { supabase } from '../../lib/supabase';

// Supabase tables aligned to DBscripts/SupabaseScripts/table.sql
const USER_TABLE = 'User';
const NEWSLETTER_TABLE = 'UserNewsLetterSubs';

export default withCors(async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, message: 'Method Not Allowed', statusCode: 405 });
    return;
  }

  const { email } = (req.body as any) || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ success: false, message: 'Missing or invalid email', statusCode: 400 });
    return;
  }

  try {
    // Ensure user exists (FK constraint on User(email))
    const { data: userRow, error: userErr } = await supabase
      .from(USER_TABLE)
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (userErr) {
      console.error('Supabase user lookup error:', userErr);
      res.status(500).json({ success: false, message: userErr.message || 'User lookup failed', statusCode: 500 });
      return;
    }
    if (!userRow?.email) {
      res.status(404).json({ success: false, message: 'User not found for given email', statusCode: 404 });
      return;
    }

    const now = new Date().toISOString();
    const payload = { email, accepted_at: now };

    // Upsert by primary key (email)
    const { error: upsertErr } = await supabase
      .from(NEWSLETTER_TABLE)
      .upsert(payload, { onConflict: 'email' });

    if (upsertErr) {
      console.error('Supabase newsletter upsert error:', upsertErr);
      res.status(500).json({ success: false, message: upsertErr.message || 'Failed to subscribe to newsletter', statusCode: 500 });
      return;
    }

    res.status(200).json({ success: true, message: 'Subscribed to newsletter', statusCode: 200, data: { email, accepted_at: now } });
  } catch (err: any) {
    console.error('Unexpected error in /api/newsletter/subscribe:', err);
    res.status(500).json({ success: false, message: err?.message || 'Unexpected server error', statusCode: 500 });
  }
});