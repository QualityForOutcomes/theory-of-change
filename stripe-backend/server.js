require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS allowlist
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:5173,http://localhost:5174,http://localhost:5175')
  .split(',')
  .map(o => o.trim());

const corsOptions = {
  origin: function (origin, callback) {
    // Allow REST tools or same-origin requests without origin header
    if (!origin) return callback(null, true);
    // Always allow localhost origins in development
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  // Be permissive with headers used by browsers and axios
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: false,
  optionsSuccessStatus: 204,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Explicitly handle preflight requests for all routes

// Import and mount the serverless functions
const createCheckoutSession = require('./api/payment/create-checkout-session');
const cancelSubscription = require('./api/payment/cancel-subscription');
const getSubscription = require('./api/payment/get-subscription');
const updateSubscription = require('./api/payment/update-subscription');

// Route handlers that mimic Vercel's serverless function behavior
// Preflight for create-checkout-session
app.options('/api/payment/create-checkout-session', cors(corsOptions));

app.post('/api/payment/create-checkout-session', (req, res) => {
  // Ensure CORS headers for non-simple requests
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  console.log('➡️  POST /api/payment/create-checkout-session', { origin: req.headers.origin });
  createCheckoutSession(req, res);
});

// Preflight for cancel-subscription
app.options('/api/payment/cancel-subscription', cors(corsOptions));

app.post('/api/payment/cancel-subscription', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  console.log('➡️  POST /api/payment/cancel-subscription', { origin: req.headers.origin });
  cancelSubscription(req, res);
});

// Preflight for get-subscription
app.options('/api/payment/get-subscription', cors(corsOptions));

app.get('/api/payment/get-subscription', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  console.log('➡️  GET /api/payment/get-subscription', { origin: req.headers.origin });
  getSubscription(req, res);
});
app.post('/api/payment/get-subscription', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  console.log('➡️  POST /api/payment/get-subscription', { origin: req.headers.origin });
  getSubscription(req, res);
});

// Preflight for update-subscription
app.options('/api/payment/update-subscription', cors(corsOptions));

app.post('/api/payment/update-subscription', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  console.log('➡️  POST /api/payment/update-subscription', { origin: req.headers.origin });
  updateSubscription(req, res);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Stripe backend server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Stripe backend server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/payment/create-checkout-session`);
  console.log(`   POST http://localhost:${PORT}/api/payment/cancel-subscription`);
  console.log(`   POST http://localhost:${PORT}/api/payment/update-subscription`);
  console.log(`   GET  http://localhost:${PORT}/api/payment/get-subscription`);
  console.log(`   POST http://localhost:${PORT}/api/payment/get-subscription`);
  console.log(`   GET  http://localhost:${PORT}/health`);
});