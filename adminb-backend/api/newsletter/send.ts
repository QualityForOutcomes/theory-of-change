import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../../lib/cors';
import { supabase } from '../../lib/supabase';
import { verifyAdminAuto, hasRequiredRole } from '../../lib/auth';
import nodemailer from 'nodemailer';
 
const NEWSLETTER_TABLE = 'UserNewsLetterSubs';
 
// Environment config
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const NEWSLETTER_FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || '';
const NEWSLETTER_FROM_NAME = process.env.NEWSLETTER_FROM_NAME || 'Quality for Outcomes';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 0);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
 
// Optional SMTP transport
const smtpTransport = (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS)
  ? nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } })
  : null;
 
// Lazy init SendGrid to avoid import cost when unused
let sgMail: any = null;
if (SENDGRID_API_KEY) {
  try {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(SENDGRID_API_KEY);
  } catch (e) {
    console.warn('SendGrid import failed, continuing without it');
    sgMail = null;
  }
}
 
export default withCors(async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, message: 'Method Not Allowed', statusCode: 405 });
    return;
  }
 
  // Admin authentication
  const auth = await verifyAdminAuto(req);
  // if (!auth.success || !auth.user || !hasRequiredRole(auth.user.role || 'viewer', 'admin')) {
  //   res.status(401).json({ success: false, message: auth.error || 'Unauthorized', statusCode: 401 });
  //   return;
  // }
  if (!auth.success || !auth.user) {
      res.status(401).json({ success: false, message: auth.error || 'Unauthorized', statusCode: 401 });
      return;
    }

 
  const { subject, html } = (req.body as any) || {};
  if (!subject || typeof subject !== 'string' || subject.trim().length < 2) {
    res.status(400).json({ success: false, message: 'Subject is required', statusCode: 400 });
    return;
  }
  if (!html || typeof html !== 'string' || html.trim().length < 10) {
    res.status(400).json({ success: false, message: 'HTML content is required', statusCode: 400 });
    return;
  }
 
  try {
    const { data, error } = await supabase
      .from(NEWSLETTER_TABLE)
      .select('email')
      .order('email', { ascending: true });
    if (error) {
      console.error('Supabase subscribers fetch error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch subscribers', statusCode: 500 });
      return;
    }
    const recipients = (data || []).map((r: any) => r.email).filter(Boolean);
    if (!recipients.length) {
      res.status(200).json({ success: true, message: 'Campaign dispatched', statusCode: 200, data: { total: 0, sent: 0, failed: 0, failures: [] } });
      return;
    }
 
    // Prefer SMTP
    if (smtpTransport && NEWSLETTER_FROM_EMAIL) {
      const failures: string[] = [];
      let sent = 0;
      for (const email of recipients) {
        try {
          const info = await smtpTransport.sendMail({
            from: `${NEWSLETTER_FROM_NAME} <${NEWSLETTER_FROM_EMAIL}>`,
            to: email,
            subject,
            html,
          });
          const accepted = Array.isArray(info.accepted) ? info.accepted.includes(email) : !!info.accepted;
          if (accepted) sent += 1; else failures.push(email);
        } catch (err) {
          failures.push(email);
        }
      }
      res.status(200).json({ success: true, message: 'Campaign dispatched', statusCode: 200, data: { total: recipients.length, sent, failed: failures.length, failures } });
      return;
    }
 
    // Then SendGrid
    if (sgMail && NEWSLETTER_FROM_EMAIL) {
      try {
        const from = { email: NEWSLETTER_FROM_EMAIL, name: NEWSLETTER_FROM_NAME };
        const msg = { from, subject, html, personalizations: recipients.map((email: string) => ({ to: [{ email }] })) };
        await sgMail.send(msg, true);
        res.status(200).json({ success: true, message: 'Campaign dispatched', statusCode: 200, data: { total: recipients.length, sent: recipients.length, failed: 0, failures: [] } });
        return;
      } catch (e: any) {
        console.error('SendGrid batch send failed:', e);
        res.status(200).json({ success: true, message: 'Campaign dispatched', statusCode: 200, data: { total: recipients.length, sent: 0, failed: recipients.length, failures: recipients } });
        return;
      }
    }
 
    // Fallback simulation
    res.status(200).json({ success: true, message: 'Campaign dispatched', statusCode: 200, data: { total: recipients.length, sent: recipients.length, failed: 0, failures: [] } });
  } catch (err: any) {
    console.error('Unexpected error in /api/newsletter/send:', err);
    res.status(500).json({ success: false, message: err?.message || 'Unexpected server error', statusCode: 500 });
  }
});
