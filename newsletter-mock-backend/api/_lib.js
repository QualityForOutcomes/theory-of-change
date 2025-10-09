import 'dotenv/config';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Env and shared config
const config = {
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  ALLOW_DEV_TOKEN: process.env.ALLOW_DEV_TOKEN === 'true',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  NEWSLETTER_FROM_EMAIL: process.env.NEWSLETTER_FROM_EMAIL,
  NEWSLETTER_FROM_NAME: process.env.NEWSLETTER_FROM_NAME || 'Newsletter',
  TEST_RECIPIENT_EMAIL: process.env.TEST_RECIPIENT_EMAIL,
  SMTP_PROVIDER: process.env.SMTP_PROVIDER,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
  SMTP_SECURE: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : undefined,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  TOC_SUPABASE_URL: process.env.TOC_SUPABASE_URL,
  TOC_SUPABASE_SERVICE_ROLE_KEY: process.env.TOC_SUPABASE_SERVICE_ROLE_KEY,
};

// SendGrid init (if provided)
if (config.SENDGRID_API_KEY) {
  try {
    sgMail.setApiKey(config.SENDGRID_API_KEY);
    console.log('[vercel-api] SendGrid enabled');
  } catch (e) {
    console.warn('[vercel-api] SendGrid init failed:', e?.message || e);
  }
}

// SMTP transport (optional)
let smtpTransport = null;
if (config.SMTP_PROVIDER === 'gmail' || config.SMTP_HOST) {
  try {
    smtpTransport = nodemailer.createTransport({
      host: config.SMTP_HOST || 'smtp.gmail.com',
      port: config.SMTP_PORT ?? (config.SMTP_PROVIDER === 'gmail' ? 465 : 587),
      secure: config.SMTP_SECURE ?? (config.SMTP_PROVIDER === 'gmail'),
      auth: config.SMTP_USER && config.SMTP_PASS ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
    });
    console.log('[vercel-api] SMTP transport configured', {
      host: config.SMTP_HOST || 'smtp.gmail.com',
      port: config.SMTP_PORT ?? (config.SMTP_PROVIDER === 'gmail' ? 465 : 587),
      secure: config.SMTP_SECURE ?? (config.SMTP_PROVIDER === 'gmail'),
      user: config.SMTP_USER ? 'set' : 'not-set',
    });
  } catch (e) {
    console.warn('[vercel-api] SMTP transport init failed:', e?.message || e);
  }
}

// Supabase client (service role) if configured
let supabase = null;
if (config.TOC_SUPABASE_URL && config.TOC_SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabase = createClient(config.TOC_SUPABASE_URL, config.TOC_SUPABASE_SERVICE_ROLE_KEY);
    console.log('[vercel-api] Supabase client initialized');
  } catch (e) {
    console.warn('[vercel-api] Supabase init failed:', e?.message || e);
  }
}

// Utilities
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function verifyToken(authHeader) {
  const token = (authHeader || '').startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;
  if (!token) return { ok: false, error: 'Unauthorized: missing Bearer token' };
  if (config.ALLOW_DEV_TOKEN && token === 'dev-token') {
    return { ok: true };
  }
  try {
    jwt.verify(token, config.JWT_SECRET);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'Unauthorized: invalid token' };
  }
}

export { config, smtpTransport, supabase, sgMail, setCors, verifyToken };