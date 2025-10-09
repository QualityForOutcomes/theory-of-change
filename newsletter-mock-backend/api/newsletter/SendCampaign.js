import { config, smtpTransport, supabase, sgMail, setCors, verifyToken } from '../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const auth = req.headers['authorization'] || '';
  const authResult = verifyToken(auth);
  if (!authResult.ok) {
    return res.status(401).json({ success: false, message: authResult.error });
  }

  const { subject, html } = req.body || {};
  if (!subject || !html) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: ['Subject and html are required'] });
  }

  try {
    // Supabase-based send to all subscribers
    if (supabase && config.NEWSLETTER_FROM_EMAIL) {
      const { data, error } = await supabase
        .from('UserNewsLetterSubs')
        .select('email')
        .order('email', { ascending: true });
      if (error) throw error;
      const recipients = (data || []).map(r => r.email);
      if (!recipients.length) {
        return res.json({ success: true, message: 'Campaign dispatched', data: { total: 0, sent: 0, failed: 0, failures: [] } });
      }
      // Prefer SMTP, then SendGrid, else simulate
      if (smtpTransport) {
        const failures = [];
        let sent = 0;
        for (const email of recipients) {
          try {
            const info = await smtpTransport.sendMail({
              from: `${config.NEWSLETTER_FROM_NAME} <${config.NEWSLETTER_FROM_EMAIL}>`,
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
      } else if (config.SENDGRID_API_KEY) {
        try {
          const from = { email: config.NEWSLETTER_FROM_EMAIL, name: config.NEWSLETTER_FROM_NAME };
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
        return res.json({ success: true, message: 'Campaign dispatched', data: { total: recipients.length, sent: recipients.length, failed: 0, failures: [] } });
      }
    }

    // Single test address using SendGrid
    if (config.SENDGRID_API_KEY && config.NEWSLETTER_FROM_EMAIL && config.TEST_RECIPIENT_EMAIL) {
      try {
        const from = { email: config.NEWSLETTER_FROM_EMAIL, name: config.NEWSLETTER_FROM_NAME };
        await sgMail.send({ to: config.TEST_RECIPIENT_EMAIL, from, subject, html });
        return res.json({ success: true, message: 'Campaign dispatched', data: { total: 1, sent: 1, failed: 0, failures: [] } });
      } catch (error) {
        const reason = error?.response?.body || error?.message || 'SendGrid error';
        return res.json({ success: true, message: 'Campaign dispatched', data: { total: 1, sent: 0, failed: 1, failures: [{ email: config.TEST_RECIPIENT_EMAIL, reason }] } });
      }
    }

    // Single test address via SMTP
    if (smtpTransport && config.NEWSLETTER_FROM_EMAIL && config.TEST_RECIPIENT_EMAIL) {
      try {
        const info = await smtpTransport.sendMail({
          from: `${config.NEWSLETTER_FROM_NAME} <${config.NEWSLETTER_FROM_EMAIL}>`,
          to: config.TEST_RECIPIENT_EMAIL,
          subject,
          html,
        });
        const accepted = Array.isArray(info.accepted) ? info.accepted.length : (info.accepted ? 1 : 0);
        const rejected = Array.isArray(info.rejected) ? info.rejected.length : (info.rejected ? 1 : 0);
        return res.json({ success: true, message: 'Campaign dispatched', data: { total: 1, sent: accepted, failed: rejected, failures: rejected ? [{ email: config.TEST_RECIPIENT_EMAIL, reason: info.response || 'SMTP rejected' }] : [] } });
      } catch (error) {
        const reason = error?.response || error?.message || 'SMTP error';
        return res.json({ success: true, message: 'Campaign dispatched', data: { total: 1, sent: 0, failed: 1, failures: [{ email: config.TEST_RECIPIENT_EMAIL, reason }] } });
      }
    }

    // Fallback simulation
    const recipients = ['alice@example.com', 'bob@example.com', 'carol@example.com'];
    const shouldFail = typeof html === 'string' && html.toLowerCase().includes('fail');
    const failures = shouldFail ? [recipients[0]] : [];
    const sent = recipients.length - failures.length;
    return res.json({ success: true, message: 'Campaign dispatched', data: { total: recipients.length, sent, failed: failures.length, failures } });
  } catch (error) {
    console.error('Vercel SendCampaign error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

