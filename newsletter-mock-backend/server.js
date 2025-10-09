import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const NEWSLETTER_FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL;
const NEWSLETTER_FROM_NAME = process.env.NEWSLETTER_FROM_NAME || 'Newsletter';
const TEST_RECIPIENT_EMAIL = process.env.TEST_RECIPIENT_EMAIL; // set this to your email to receive a test
const SMTP_PROVIDER = process.env.SMTP_PROVIDER; // 'gmail' for Gmail SMTP
const SMTP_HOST = process.env.SMTP_HOST; // override host if needed
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const SMTP_SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : undefined; // true for 465
const SMTP_USER = process.env.SMTP_USER; // SMTP username (email address for Gmail)
const SMTP_PASS = process.env.SMTP_PASS; // SMTP password (app password for Gmail)
const TOC_SUPABASE_URL = process.env.TOC_SUPABASE_URL;
const TOC_SUPABASE_SERVICE_ROLE_KEY = process.env.TOC_SUPABASE_SERVICE_ROLE_KEY;

app.use(cors());
app.use(express.json());

if (SENDGRID_API_KEY) {
  try {
    sgMail.setApiKey(SENDGRID_API_KEY);
    console.log('[mock-backend] SendGrid enabled');
  } catch (e) {
    console.warn('[mock-backend] SendGrid init failed:', e?.message || e);
  }
}

let smtpTransport = null;
if (SMTP_PROVIDER === 'gmail' || SMTP_HOST) {
  try {
    smtpTransport = nodemailer.createTransport({
      host: SMTP_HOST || 'smtp.gmail.com',
      port: SMTP_PORT ?? (SMTP_PROVIDER === 'gmail' ? 465 : 587),
      secure: SMTP_SECURE ?? (SMTP_PROVIDER === 'gmail'),
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
    console.log('[mock-backend] SMTP transport configured', {
      host: SMTP_HOST || 'smtp.gmail.com',
      port: SMTP_PORT ?? (SMTP_PROVIDER === 'gmail' ? 465 : 587),
      secure: SMTP_SECURE ?? (SMTP_PROVIDER === 'gmail'),
      user: SMTP_USER ? 'set' : 'not-set',
    });
  } catch (e) {
    console.warn('[mock-backend] SMTP transport init failed:', e?.message || e);
  }
}

// Initialize Supabase client (service role) if configured
let supabase = null;
if (TOC_SUPABASE_URL && TOC_SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabase = createClient(TOC_SUPABASE_URL, TOC_SUPABASE_SERVICE_ROLE_KEY);
    console.log('[mock-backend] Supabase client initialized');
  } catch (e) {
    console.warn('[mock-backend] Supabase init failed:', e?.message || e);
  }
}

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ok', data: { timestamp: new Date().toISOString() } });
});

// Mock SendCampaign endpoint
app.post('/api/newsletter/SendCampaign', (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized: missing Bearer token' });
    }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Unauthorized: invalid token' });
    }

    const { subject, html } = req.body || {};
    if (!subject || !html) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: ['Subject and html are required'] });
    }
    // If Supabase is configured, fetch all newsletter subscribers and send to all.
    if (supabase && NEWSLETTER_FROM_EMAIL) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('UserNewsLetterSubs')
            .select('email')
            .order('email', { ascending: true });
          if (error) throw error;
          const recipients = (data || []).map(r => r.email);
          if (!recipients.length) {
            return res.json({ success: true, message: 'Campaign dispatched', data: { total: 0, sent: 0, failed: 0, failures: [] } });
          }
          // Prefer SMTP if configured, else SendGrid if configured, otherwise simulate
          if (smtpTransport) {
            const failures = [];
            let sent = 0;
            // Send individually to avoid BCC limitations; simple loop for mock scale
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
            return res.json({ success: true, message: 'Campaign dispatched', data: { total: recipients.length, sent, failed: failures.length, failures } });
          } else if (SENDGRID_API_KEY) {
            try {
              const from = { email: NEWSLETTER_FROM_EMAIL, name: NEWSLETTER_FROM_NAME };
              // Batch using personalizations
              const msg = {
                from,
                subject,
                html,
                personalizations: recipients.map(email => ({ to: [{ email }] })),
              };
              await sgMail.send(msg, true);
              return res.json({ success: true, message: 'Campaign dispatched', data: { total: recipients.length, sent: recipients.length, failed: 0, failures: [] } });
            } catch (error) {
              console.error('SendGrid batch send failed:', error);
              return res.json({ success: true, message: 'Campaign dispatched', data: { total: recipients.length, sent: 0, failed: recipients.length, failures: recipients } });
            }
          } else {
            // If neither sending provider configured, simulate
            return res.json({ success: true, message: 'Campaign dispatched', data: { total: recipients.length, sent: recipients.length, failed: 0, failures: [] } });
          }
        } catch (err) {
          console.error('Supabase-based campaign failed:', err);
          return res.status(500).json({ success: false, message: 'Failed to fetch subscribers or send campaign' });
        }
      })();
      return;
    }
    // If SendGrid and required envs are provided, perform a real send to a single test address
    if (SENDGRID_API_KEY && NEWSLETTER_FROM_EMAIL && TEST_RECIPIENT_EMAIL) {
      (async () => {
        try {
          const from = { email: NEWSLETTER_FROM_EMAIL, name: NEWSLETTER_FROM_NAME };
          await sgMail.send({ to: TEST_RECIPIENT_EMAIL, from, subject, html });
          return res.json({ success: true, message: 'Campaign dispatched', data: { total: 1, sent: 1, failed: 0, failures: [] } });
        } catch (error) {
          const reason = error?.response?.body || error?.message || 'SendGrid error';
          return res.json({ success: true, message: 'Campaign dispatched', data: { total: 1, sent: 0, failed: 1, failures: [{ email: TEST_RECIPIENT_EMAIL, reason }] } });
        }
      })();
      return; // ensure we don't continue to simulation
    }

    // If SMTP transport is configured and required envs are provided, send via SMTP (Gmail)
    if (smtpTransport && NEWSLETTER_FROM_EMAIL && TEST_RECIPIENT_EMAIL) {
      (async () => {
        try {
          const info = await smtpTransport.sendMail({
            from: `${NEWSLETTER_FROM_NAME} <${NEWSLETTER_FROM_EMAIL}>`,
            to: TEST_RECIPIENT_EMAIL,
            subject,
            html,
          });
          const accepted = Array.isArray(info.accepted) ? info.accepted.length : (info.accepted ? 1 : 0);
          const rejected = Array.isArray(info.rejected) ? info.rejected.length : (info.rejected ? 1 : 0);
          return res.json({ success: true, message: 'Campaign dispatched', data: { total: 1, sent: accepted, failed: rejected, failures: rejected ? [{ email: TEST_RECIPIENT_EMAIL, reason: info.response || 'SMTP rejected' }] : [] } });
        } catch (error) {
          const reason = error?.response || error?.message || 'SMTP error';
          return res.json({ success: true, message: 'Campaign dispatched', data: { total: 1, sent: 0, failed: 1, failures: [{ email: TEST_RECIPIENT_EMAIL, reason }] } });
        }
      })();
      return; // ensure we don't continue to simulation
    }

  // Simulate recipients and sending outcome
  const recipients = [
    'alice@example.com',
    'bob@example.com',
    'carol@example.com'
  ];

    // Optional failure simulation: if html contains the word "fail", mark one failure
    const shouldFail = typeof html === 'string' && html.toLowerCase().includes('fail');
    const failures = shouldFail ? [recipients[0]] : [];
    const sent = recipients.length - failures.length;

    return res.json({
      success: true,
      message: 'Campaign dispatched',
      data: {
        total: recipients.length,
        sent,
        failed: failures.length,
        failures
      }
    });
  } catch (error) {
    console.error('Mock SendCampaign error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Newsletter Mock Backend running at http://localhost:${PORT}`);
});