import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../../lib/cors';
import { supabase } from '../../lib/supabase';

// Table names aligned with Supabase schema
const USER_TABLE = 'User';
const TERMS_TABLE = 'UserTermsAcceptance';

export default withCors(async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, message: 'Method Not Allowed', statusCode: 405 });
    return;
  }

  const { email, terms_version } = (req.body as any) || {};

  if (!email || typeof email !== 'string') {
    res.status(400).json({ success: false, message: 'Missing required field: email', statusCode: 400 });
    return;
  }

  try {
    // 1) Lookup user_id by email
    const { data: userRow, error: userErr } = await supabase
      .from(USER_TABLE)
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (userErr) {
      console.error('Supabase user lookup error:', userErr);
      res.status(500).json({ success: false, message: userErr.message || 'User lookup failed', statusCode: 500 });
      return;
    }
    if (!userRow?.user_id) {
      res.status(404).json({ success: false, message: 'User not found for given email', statusCode: 404 });
      return;
    }

    const user_id = userRow.user_id;

    // 2) Upsert acceptance record
    const now = new Date().toISOString();
    const payload: any = {
      user_id,
      email,
      accepted_at: now,
    };
    if (terms_version) payload.terms_version = String(terms_version);

    // Try update if exists; otherwise insert
    const { data: existing, error: existErr } = await supabase
      .from(TERMS_TABLE)
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existErr) {
      console.error('Supabase acceptance check error:', existErr);
      res.status(500).json({ success: false, message: existErr.message || 'Acceptance check failed', statusCode: 500 });
      return;
    }

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from(TERMS_TABLE)
        .update(payload)
        .eq('id', existing.id);
      if (updErr) {
        console.error('Supabase acceptance update error:', updErr);
        res.status(500).json({ success: false, message: updErr.message || 'Failed to update acceptance', statusCode: 500 });
        return;
      }
    } else {
      const { error: insErr } = await supabase
        .from(TERMS_TABLE)
        .insert(payload);
      if (insErr) {
        console.error('Supabase acceptance insert error:', insErr);
        res.status(500).json({ success: false, message: insErr.message || 'Failed to insert acceptance', statusCode: 500 });
        return;
      }
    }

    res.status(200).json({ success: true, message: 'Terms acceptance recorded', statusCode: 200, data: { user_id, email, accepted_at: now, terms_version: payload.terms_version || null } });
    return;
  } catch (err: any) {
    console.error('Unexpected error in /api/terms/accept:', err);
    res.status(500).json({ success: false, message: err?.message || 'Unexpected server error', statusCode: 500 });
    return;
  }
});