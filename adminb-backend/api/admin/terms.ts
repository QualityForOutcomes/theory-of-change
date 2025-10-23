import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../../lib/cors';
import { supabase } from '../../lib/supabase';

// Using Supabase table to store the single Terms & Conditions content row.
// Since the provided schema doesn't include a Terms table, we will use
// a simple key-value table approach. Create table manually in Supabase if missing:
//
// CREATE TABLE IF NOT EXISTS AppSettings (
//   id SERIAL PRIMARY KEY,
//   key TEXT UNIQUE NOT NULL,
//   value TEXT NOT NULL,
//   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
// );
//
// We store terms under key = 'terms_content'. If you already have a different
// table for terms, adjust TABLE_NAME and selectors accordingly.

const TABLE_NAME = 'TermsAndCondition';
const TERMS_KEY = 'terms_content';

export default withCors(async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      // Fetch terms content by key
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('value')
        .eq('key', TERMS_KEY)
        .maybeSingle();

      if (error) {
        console.error('[terms] GET error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch terms', statusCode: 500 });
        return;
      }

      const content = data?.value || '';
      // Align with dev-server stub: return top-level { content }
      res.status(200).json({ content });
      return;
    }

    if (req.method === 'POST') {
      const { content } = (req.body as any) || {};
      if (!content || typeof content !== 'string' || content.trim().length < 50) {
        res.status(400).json({ success: false, message: 'Content invalid or too short (min 50 chars).', statusCode: 400 });
        return;
      }

      // Upsert the terms content into settings
      // Try update first
      const { data: existing, error: existErr } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .eq('key', TERMS_KEY)
        .maybeSingle();

      if (existErr) {
        console.error('[terms] select existing error:', existErr);
        res.status(500).json({ success: false, message: existErr.message || 'Failed to check existing terms', statusCode: 500 });
        return;
      }

      if (existing?.id) {
        const { error: updErr } = await supabase
          .from(TABLE_NAME)
          .update({ value: content, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (updErr) {
          console.error('[terms] update error:', updErr);
          res.status(500).json({ success: false, message: updErr.message || 'Failed to update terms', statusCode: 500 });
          return;
        }
      } else {
        const { error: insErr } = await supabase
          .from(TABLE_NAME)
          .insert({ key: TERMS_KEY, value: content, updated_at: new Date().toISOString() });
        if (insErr) {
          console.error('[terms] insert error:', insErr);
          res.status(500).json({ success: false, message: insErr.message || 'Failed to insert terms', statusCode: 500 });
          return;
        }
      }

      // Align with dev-server stub: return simple success
      res.status(200).json({ success: true });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ success: false, message: 'Method Not Allowed', statusCode: 405 });
    return;
  } catch (err: any) {
    console.error('[terms] unexpected error:', err);
    res.status(500).json({ success: false, message: err?.message || 'Unexpected server error', statusCode: 500 });
    return;
  }
});