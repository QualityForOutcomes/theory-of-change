// Local test for stripe-backend/api/payment/get-subscription.js without network
// Validates STRIPE_SECRET_KEY guard and basic request validation paths.

const handler = require('../api/payment/get-subscription');

function makeRes(label) {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      console.log(`TEST ${label} -> status:`, this.statusCode);
      console.log(`TEST ${label} -> payload:`, JSON.stringify(payload));
      return this;
    },
    end() {
      console.log(`TEST ${label} -> ended with status:`, this.statusCode);
    }
  };
}

async function run() {
  // Case 1: Missing STRIPE_SECRET_KEY should return 500
  delete process.env.STRIPE_SECRET_KEY;
  const req1 = { method: 'GET', query: { subscription_id: 'sub_123' }, headers: {} };
  const res1 = makeRes('missing-key');
  await handler(req1, res1);

  // Case 2: Dummy STRIPE_SECRET_KEY but missing params should return 400
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  const req2 = { method: 'GET', query: {}, headers: {} };
  const res2 = makeRes('dummy-key-missing-params');
  await handler(req2, res2);

  console.log('Local tests complete.');
}

run().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});