const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })
const express = require('express')
const cors = require('cors')
const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')

const app = express()
const PORT = Number(process.env.PORT || 4001)
app.use(express.json())

// Initialize Supabase client for dev server
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  } catch (e) {
    console.warn('[dev] Supabase init failed:', e?.message || e);
  }
} else {
  console.warn('[dev] Missing Supabase env; newsletter send will use mock recipients');
}

// Email transport configuration (SMTP preferred, SendGrid optional)
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || ''
const NEWSLETTER_FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || ''
const NEWSLETTER_FROM_NAME = process.env.NEWSLETTER_FROM_NAME || 'Quality for Outcomes'
const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = Number(process.env.SMTP_PORT || 0)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''

const smtpTransport = (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS)
  ? nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } })
  : null

let sgMail = null
if (SENDGRID_API_KEY) {
  try {
    sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(SENDGRID_API_KEY)
  } catch (e) {
    console.warn('[dev] SendGrid import failed, continuing without it')
    sgMail = null
  }
}

// Allow local dev origins flexibly (5173/5174/5175 or any localhost)
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    const allowed = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ]
    if (allowed.includes(origin)) return callback(null, true)
    if (origin.startsWith('http://localhost')) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 204,
}
app.use(cors(corsOptions))
// Generic preflight handler (Express v5 avoids wildcard patterns)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin || '*'
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Vary', 'Origin')
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin')
    return res.sendStatus(204)
  }
  next()
})

// Preflight handled by generic middleware above (no wildcard routes needed)

app.get('/api/hello', (req, res) => {
  const name = req.query.name || 'World'
  res.json({ message: `Hello ${name}!` })
})

// --- Dev stub: Terms & Conditions management (no history/versioning) ---
let TERMS_CONTENT = `# Terms & Conditions\n\nWelcome to Quality for Outcomes. By using this service, you agree to the following terms and conditions...`

app.get('/api/admin/terms', async (req, res) => {
  // Return in-memory Terms content (no history/versioning)
  res.status(200).json({ content: TERMS_CONTENT })
})

app.post('/api/admin/terms', async (req, res) => {
  const { content } = req.body || {}
  if (!content || typeof content !== 'string' || content.trim().length < 50) {
    return res.status(400).json({ success: false, message: 'Content invalid or too short (min 50 chars).' })
  }
  // Update in-memory Terms content only
  TERMS_CONTENT = content
  res.status(200).json({ success: true })
})

// Removed: /api/admin/terms/history endpoint (edit history disabled)

// Auth: simple dev-only login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  const ADMIN_EMAIL = 'qualityforoutcomes@gmail.com'
  const ADMIN_PASSWORD = 'Theoryofchange1!'
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = 'local-dev-jwt'
    const user = {
      id: 'admin-1',
      email: ADMIN_EMAIL,
      role: 'super_admin',
      firstName: 'Admin',
      lastName: 'User',
    }
    return res.status(200).json({ success: true, message: 'Login successful', statusCode: 200, data: { token, user } })
  }
  return res.status(401).json({ success: false, message: 'Invalid credentials', statusCode: 401 })
})

// Auth: simple dev-only token verification
app.get('/api/auth/verify', (req, res) => {
  const auth = req.headers['authorization'] || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (token === 'local-dev-jwt') {
    const user = {
      id: 'admin-1',
      email: 'qualityforoutcomes@gmail.com',
      role: 'super_admin',
      firstName: 'Admin',
      lastName: 'User',
    }
    return res.status(200).json({ success: true, message: 'Token valid', statusCode: 200, data: { user } })
  }
  return res.status(401).json({ success: false, message: 'Invalid token', statusCode: 401 })
})

app.get('/api/dashboard', async (req, res) => {
  console.log('[dev] GET /api/dashboard', { ip: req.ip, ua: req.headers['user-agent'] })
  if (req.query.quick === '1') {
    return res.status(200).json({ success: true, statusCode: 200, message: 'quick stub', data: { overview: { revenue: { amountCents: 0, count: 0, period: 'month', growth: { currentMonth: 0, lastMonth: 0, growthPercent: 0 } } } } })
  }
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID
  const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID
  const PRO_PRODUCT_ID = process.env.STRIPE_PRO_PRODUCT_ID
  const PREMIUM_PRODUCT_ID = process.env.STRIPE_PREMIUM_PRODUCT_ID

  if (!stripeSecretKey) {
    const months = ['Apr','May','Jun','Jul','Aug','Sep']
    return res.status(200).json({
      success: true,
      message: 'Demo dashboard (no STRIPE_SECRET_KEY configured)',
      statusCode: 200,
      data: {
        overview: {
          users: { total: 42, newThisMonth: 5 },
          subscriptions: {
            total: 10, active: 7, trialing: 2, pastDue: 1, canceled: 0, incomplete: 0,
          },
          revenue: {
            amountCents: 8240000,
            count: 12,
            period: 'month',
            growth: { currentMonth: 8240000, lastMonth: 7000000, growthPercent: 12.4 },
          },
          premiumCustomers: { total: 3, new: 1, churn: 0 },
          proCustomers: { total: 5, new: 2, churn: 1 },
          traffic: { today: 1280, monthly: 32140, quarterly: 91520 },
        },
        charts: {
          revenueTrend: months.map((m,i)=>({ month: m, revenue: 7000 + i*2000 })),
          trafficTrend: months.map((m,i)=>({ month: m, traffic: 5000 + i*5000 })),
        },
        recentSubscriptions: [
          { id: 'SUB-0012', userName: 'Olivia Rhye', tier: 'Premium', period: 'Monthly', amountCents: 2900, status: 'active' },
          { id: 'SUB-0013', userName: 'James Doe', tier: 'Pro', period: 'Quarterly', amountCents: 5900, status: 'past_due' },
        ],
      },
    })
  }

  console.log('[dev] Initializing Stripe client')
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

  function monthBounds(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
    return { start: Math.floor(start.getTime() / 1000), end: Math.floor(end.getTime() / 1000) }
  }
  function dayBounds(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
    return { start: Math.floor(start.getTime() / 1000), end: Math.floor(end.getTime() / 1000) }
  }
  function lastNMonthsLabels(n) {
    const out = []
    const now = new Date()
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const { start, end } = monthBounds(d)
      const label = d.toLocaleString('en-US', { month: 'short' })
      out.push({ label, start, end })
    }
    return out
  }

  async function sumInvoices(from, to) {
    let starting_after = undefined
    let totalCents = 0
    let count = 0
    do {
      const page = await stripe.invoices.list({ limit: 100, status: 'paid', starting_after, created: { gte: from, lte: to } })
      for (const inv of page.data) {
        totalCents += (inv.total ?? 0)
        count += 1
      }
      starting_after = page.has_more ? page.data[page.data.length - 1].id : undefined
    } while (starting_after)
    return { totalCents, count }
  }

  async function countByPrice() {
    let starting_after = undefined
    let pro = 0, premium = 0, total = 0, active = 0, trialing = 0, past_due = 0, canceled = 0, incomplete = 0
    do {
      const page = await stripe.subscriptions.list({ limit: 100, status: 'all', starting_after })
      for (const s of page.data) {
        total += 1
        switch (s.status) {
          case 'active': active += 1; break
          case 'trialing': trialing += 1; break
          case 'past_due': past_due += 1; break
          case 'canceled': canceled += 1; break
          case 'incomplete': incomplete += 1; break
          default: break
        }
        // Count Premium/Pro ONLY for active subscriptions; match by price or product IDs
        if (s.status === 'active') {
          const priceObj = s.items?.data?.[0]?.price
          const itemPriceId = priceObj?.id || null
          const itemProductId = (() => {
            const prod = priceObj?.product
            if (!prod) return null
            return typeof prod === 'string' ? prod : prod.id
          })()
          const isPro = (itemPriceId === PRO_PRICE_ID) || (!!PRO_PRODUCT_ID && itemProductId === PRO_PRODUCT_ID)
          const isPremium = (itemPriceId === PREMIUM_PRICE_ID) || (!!PREMIUM_PRODUCT_ID && itemProductId === PREMIUM_PRODUCT_ID)
          if (isPro) pro += 1
          if (isPremium) premium += 1
        }
      }
      starting_after = page.has_more ? page.data[page.data.length - 1].id : undefined
    } while (starting_after)
    return { pro, premium, total, active, trialing, past_due, canceled, incomplete }
  }

  try {
    console.log('[dev] Aggregating Stripe data...')
    const subCounts = await countByPrice()
    const now = new Date()
    const { start, end } = monthBounds(now)
    const cur = await sumInvoices(start, end)
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const { start: lmStart, end: lmEnd } = monthBounds(lastMonthDate)
    const prev = await sumInvoices(lmStart, lmEnd)
    const growthPercent = prev.totalCents > 0 ? ((cur.totalCents - prev.totalCents) / prev.totalCents) * 100 : 0

    const months = lastNMonthsLabels(6)
    const revenueTrend = []
    const trafficTrend = []
    for (const m of months) {
      const s = await sumInvoices(m.start, m.end)
      revenueTrend.push({ month: m.label, revenue: Math.round(s.totalCents / 100) })
      trafficTrend.push({ month: m.label, traffic: s.count })
    }

    const recent = await stripe.subscriptions.list({ limit: 10, expand: ['data.customer'] })
    const recentSubscriptions = recent.data.map(s => {
      const cust = typeof s.customer === 'string' ? undefined : s.customer
      return ({
        id: s.id,
        userName: cust?.name || undefined,
        userEmail: cust?.email || undefined,
        tier: (() => {
          const priceObj = s.items?.data?.[0]?.price
          const pid = priceObj?.id
          const prodId = (() => {
            const p = priceObj?.product
            if (!p) return undefined
            return typeof p === 'string' ? p : p.id
          })()
          if (pid === PRO_PRICE_ID || (!!PRO_PRODUCT_ID && prodId === PRO_PRODUCT_ID)) return 'Pro'
          if (pid === PREMIUM_PRICE_ID || (!!PREMIUM_PRODUCT_ID && prodId === PREMIUM_PRODUCT_ID)) return 'Premium'
          return 'Other'
        })(),
        period: s.items?.data?.[0]?.price?.recurring?.interval || '—',
        amountCents: s.items?.data?.[0]?.price?.unit_amount ?? 0,
        status: s.status,
      })
    })

    const { start: tStart, end: tEnd } = dayBounds(now)
    const t = await sumInvoices(tStart, tEnd)
    const last3 = lastNMonthsLabels(3)
    let quarterlyCount = 0
    for (const m of last3) {
      const s = await sumInvoices(m.start, m.end)
      quarterlyCount += s.count
    }

    console.log('[dev] Aggregation done, sending response')
    res.status(200).json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      statusCode: 200,
      data: {
        overview: {
          users: { total: 0, newThisMonth: 0 },
          subscriptions: {
            total: subCounts.total,
            active: subCounts.active,
            trialing: subCounts.trialing,
            pastDue: subCounts.past_due,
            canceled: subCounts.canceled,
            incomplete: subCounts.incomplete,
          },
          revenue: {
            amountCents: cur.totalCents,
            count: cur.count,
            period: 'month',
            growth: {
              currentMonth: cur.totalCents,
              lastMonth: prev.totalCents,
              growthPercent: Number(growthPercent.toFixed(1)),
            },
          },
          premiumCustomers: { total: subCounts.premium, new: 0, churn: 0 },
          proCustomers: { total: subCounts.pro, new: 0, churn: 0 },
          traffic: { today: t.count, monthly: cur.count, quarterly: quarterlyCount },
        },
        charts: {
          revenueTrend,
          trafficTrend,
        },
        recentSubscriptions,
      },
    })
  } catch (err) {
    console.error('[dev] Stripe aggregation error:', err)
    res.status(500).json({ success: false, message: err.message || 'Stripe aggregation failed', statusCode: 500 })
  }
})

// --- Newsletter: subscribe ---
app.post('/api/newsletter/subscribe', async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Missing or invalid email', statusCode: 400 });
  }
  // Dev-only: simulate subscription success
  return res.status(200).json({ success: true, message: 'Subscribed to newsletter', statusCode: 200, data: { email, accepted_at: new Date().toISOString() } });
});

// --- Newsletter: send campaign ---
app.post('/api/newsletter/send', async (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token !== 'local-dev-jwt') {
    return res.status(401).json({ success: false, message: 'Unauthorized', statusCode: 401 });
  }
  const { subject, html } = req.body || {};
  if (!subject || !html) {
    return res.status(400).json({ success: false, message: 'Subject and html are required', statusCode: 400 });
  }
  try {
    let recipients = [];
    if (supabase) {
      const { data, error } = await supabase
        .from('UserNewsLetterSubs')
        .select('email')
        .order('email', { ascending: true });
      if (error) {
        console.error('[dev] Supabase subscribers fetch error:', error);
      } else {
        recipients = (data || []).map(r => r.email).filter(Boolean);
      }
    }
    // Fallback to 3 mock recipients if Supabase unavailable or empty
    if (!recipients.length) {
      recipients = ['alice@example.com', 'bob@example.com', 'carol@example.com'];
    }
    // Prefer SMTP when configured
    if (smtpTransport && NEWSLETTER_FROM_EMAIL) {
      const failures = []
      let sent = 0
      for (const email of recipients) {
        try {
          const info = await smtpTransport.sendMail({
            from: `${NEWSLETTER_FROM_NAME} <${NEWSLETTER_FROM_EMAIL}>`,
            to: email,
            subject,
            html,
          })
          const accepted = Array.isArray(info.accepted) ? info.accepted.includes(email) : !!info.accepted
          if (accepted) sent += 1; else failures.push(email)
        } catch (err) {
          failures.push(email)
        }
      }
      return res.status(200).json({ success: true, message: 'Campaign dispatched', statusCode: 200, data: { total: recipients.length, sent, failed: failures.length, failures } })
    }

    // Then SendGrid when configured
    if (sgMail && NEWSLETTER_FROM_EMAIL) {
      try {
        const from = { email: NEWSLETTER_FROM_EMAIL, name: NEWSLETTER_FROM_NAME }
        const msg = { from, subject, html, personalizations: recipients.map((email) => ({ to: [{ email }] })) }
        await sgMail.send(msg, true)
        return res.status(200).json({ success: true, message: 'Campaign dispatched', statusCode: 200, data: { total: recipients.length, sent: recipients.length, failed: 0, failures: [] } })
      } catch (e) {
        console.error('[dev] SendGrid batch send failed:', e)
        return res.status(200).json({ success: true, message: 'Campaign dispatched', statusCode: 200, data: { total: recipients.length, sent: 0, failed: recipients.length, failures: recipients } })
      }
    }

    // Fallback simulation if no transport configured
    return res.json({ success: true, message: 'Campaign dispatched (simulation)', statusCode: 200, data: { total: recipients.length, sent: recipients.length, failed: 0, failures: [] } });
  } catch (err) {
    console.error('[dev] Unexpected error in newsletter send:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Unexpected server error', statusCode: 500 });
  }
});

// Bind to default interface to support both IPv4 and IPv6 localhost resolutions
app.listen(PORT, () => {
  console.log(`Dev server listening on http://localhost:${PORT}`)
})