# QFO Admin Backend

Serverless backend for admin APIs deployed on Vercel.

## Development

1. Install dependencies: `npm install`
2. Local Express dev server: `node dev-server.js` (or `npm run dev` for Vercel functions)
3. Ensure `.env` has `PORT=4001` and optionally `DISABLE_AUTH=1` for local testing.

## Environment Variables

Create a `.env` at the project root:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_PRO_PRODUCT_ID=prod_...            # optional: match by Product ID
STRIPE_PREMIUM_PRODUCT_ID=prod_...        # optional: match by Product ID

# External token verification (Option B)
USER_SERVICE_BASE_URL=https://nodejs-serverless-function-express-rho-ashen.vercel.app
USER_SERVICE_VERIFY_PATH=/api/auth/Verify

# JWT (local verification) and security controls
JWT_SECRET=your_production_jwt_secret
JWT_EXPIRES_IN=7d
# Disable all auth checks only in non-production (local testing)
DISABLE_AUTH=0
# Explicitly allow stub login in production (default disabled)
ALLOW_STUB_LOGIN=0
```

Also set these in Vercel Project Settings → Environment Variables.

### Auth Modes

- External verification (recommended): set `USER_SERVICE_BASE_URL` to your user service; backend verifies tokens at `USER_SERVICE_VERIFY_PATH`.
- Local JWT verification (fallback): omit `USER_SERVICE_BASE_URL`; backend verifies tokens it issues via `/api/auth/login` using `JWT_SECRET`.
- Dev bypass: `DISABLE_AUTH=1` only works when `NODE_ENV!==production`. In production, auth bypass is disabled.
- Stub login in production: disabled by default; use `ALLOW_STUB_LOGIN=1` if you must enable temporarily (not recommended).

## Stripe Webhook

- Endpoint: `POST /api/webhooks/stripe`
- Configure a Stripe webhook endpoint to point to your deployed URL, e.g. `https://<your-vercel-project>.vercel.app/api/webhooks/stripe`.
- Events to enable:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.created`
  - `customer.updated`

After creating the endpoint in Stripe Dashboard, copy the `Signing secret` and set it as `STRIPE_WEBHOOK_SECRET`.

### Local Testing

Use Stripe CLI to forward events:

```
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Frontend (qfo-admin) Dev Setup

- Vite dev server runs at `http://localhost:5173`.
- Proxy forwards `/api` to backend on `http://localhost:4001`.
- Axios `baseURL` is relative (`/`) in development so the proxy applies.
- In `qfo-admin/.env.development`, set `VITE_DEV_BYPASS_AUTH=true` to bypass ProtectedRoute locally.
- Backend `.env` can set `DISABLE_AUTH=1` to make `/api/dashboard` accessible without external token verification.

With this setup, hitting `http://localhost:5173/api/dashboard` returns either:
- Live Stripe aggregate data if `STRIPE_SECRET_KEY` is configured; message: `Dashboard data retrieved successfully`.
- Demo payload if Stripe keys are absent; message: `Demo dashboard (no STRIPE_SECRET_KEY configured)`.

Notes:
- Premium/Pro totals count ONLY `active` subscriptions.
- Tier detection matches either `price.id` (via `STRIPE_*_PRICE_ID`) or, if provided, `product.id` (via `STRIPE_*_PRODUCT_ID`). Use Product IDs when multiple prices exist under one tier.
