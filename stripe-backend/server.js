require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Import and mount the serverless functions
const createCheckoutSession = require('./api/payment/create-checkout-session');
const cancelSubscription = require('./api/payment/cancel-subscription');

// Route handlers that mimic Vercel's serverless function behavior
app.post('/api/payment/create-checkout-session', (req, res) => {
  createCheckoutSession(req, res);
});

app.post('/api/payment/cancel-subscription', (req, res) => {
  cancelSubscription(req, res);
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
  console.log(`   GET  http://localhost:${PORT}/health`);
});