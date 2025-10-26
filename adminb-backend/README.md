# QFO Admin Backend (Vercel Production)

Serverless admin API deployed on Vercel and consumed by the admin frontend.

## Production Overview

- Base URL: `https://toc-adminbackend.vercel.app`
- Admin Frontend: `https://toc-adminfrontend.vercel.app`
- User Frontend (login/logout): `https://toc-userfrontend.vercel.app`
- All APIs live under `https://toc-adminbackend.vercel.app/api/...`

## Key Endpoints

- `GET /api/dashboard`
  - Requires `Authorization: Bearer <token>`.
  - Query `?quick=1` returns a fast stub for UI responsiveness.
  - When `STRIPE_SECRET_KEY` is set, returns live aggregates (active subscription counts, revenue, trends, recent subscriptions). Without Stripe, returns a demo payload.

- `GET /api/auth/verify`
  - Validates token via `verifyAdminAuto` and returns the admin user payload.

- `POST /api/auth/login`
  - Stub login (issues JWT). Disabled in production unless `ALLOW_STUB_LOGIN=1` and `JWT_SECRET` is configured.

- `GET | POST /api/admin/terms`
  - Fetch or update Terms & Conditions content stored in Supabase (`TermsAndCondition` table using key `terms_content`).

- `POST /api/newsletter/send`
  - Dispatches newsletters to subscribers in `UserNewsLetterSubs` using SMTP or SendGrid if configured.

- `POST /api/newsletter/subscribe`
  - Upserts a subscriber by email (FK checked against `User`).

- `POST /api/webhooks/stripe`
  - Stripe webhook endpoint; set `STRIPE_WEBHOOK_SECRET` and enable subscription/invoice events.

## Frontend Integration

- Admin frontend attaches `Authorization: Bearer <token>` on each request.
- Initial token handoff is supported via `?token=<JWT>`; the frontend stores it in `localStorage` and cleans the URL.
- On `401`, the frontend hard-redirects to `https://toc-userfrontend.vercel.app/logout` to clear session.
- In production, set `VITE_API_URL=https://toc-adminbackend.vercel.app` in the admin frontend.

## Authentication & Security

- Token sources: `Authorization` header (preferred), `auth_token` cookie, or `?token` query (discouraged for production).
- External verification (recommended): set `USER_SERVICE_BASE_URL` (e.g., user service) and `USER_SERVICE_VERIFY_PATH` (default `/auth/me`). Fallback paths include `/api/auth/Verify`.
- Local JWT verification (fallback): omit `USER_SERVICE_BASE_URL`; tokens issued via `/api/auth/login` are verified with `JWT_SECRET`.
- Dev bypass: `DISABLE_AUTH=1` only applies when `NODE_ENV !== production`.
- Stub login in production: disabled by default; set `ALLOW_STUB_LOGIN=1` only temporarily.

## CORS

- Allowed origins include `https://toc-adminfrontend.vercel.app`, `https://toc-userfrontend.vercel.app`, and local dev hosts. Override with `ALLOWED_ORIGINS` (comma-separated) in Vercel Environment Variables for custom domains.

## Required Environment Variables (Vercel)

- Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (required), `SUPABASE_ANON_KEY` (optional)
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_PREMIUM_PRICE_ID`, optional `STRIPE_PRO_PRODUCT_ID`, `STRIPE_PREMIUM_PRODUCT_ID`
- Auth: `JWT_SECRET`, `JWT_REFRESH_SECRET` (recommended), `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `USER_SERVICE_BASE_URL`, `USER_SERVICE_VERIFY_PATH`, `DISABLE_AUTH`, `ALLOW_STUB_LOGIN`
- CORS: `ALLOWED_ORIGINS`
- Newsletter (optional): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, or `SENDGRID_API_KEY`, plus `NEWSLETTER_FROM_EMAIL`, `NEWSLETTER_FROM_NAME`

Add all variables in Vercel → Project Settings → Environment Variables.

## Stripe Webhook Setup (Production)

- Endpoint: `POST https://toc-adminbackend.vercel.app/api/webhooks/stripe`
- Enable events: subscriptions (created/updated/deleted), invoices (payment_succeeded/payment_failed), and customer updates.
- Set the Stripe “Signing secret” as `STRIPE_WEBHOOK_SECRET` in Vercel.

## Example Requests (Production)

- Verify auth:
  - `curl -H "Authorization: Bearer $TOKEN" https://toc-adminbackend.vercel.app/api/auth/verify`
- Dashboard (live):
  - `curl -H "Authorization: Bearer $TOKEN" https://toc-adminbackend.vercel.app/api/dashboard`
- Dashboard (quick stub):
  - `curl -H "Authorization: Bearer $TOKEN" "https://toc-adminbackend.vercel.app/api/dashboard?quick=1"`
- Update terms:
  - `curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"content":"..."}' https://toc-adminbackend.vercel.app/api/admin/terms`
- Send newsletter:
  - `curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"subject":"Hello","html":"<p>Welcome</p>"}' https://toc-adminbackend.vercel.app/api/newsletter/send`

## Notes

- Premium/Pro totals count only `active` subscriptions; tier detection matches by `price.id` or `product.id`.
- Set `ALLOWED_ORIGINS` when using custom frontend domains.
- In production, prefer `Authorization` header over `?token` for security.
