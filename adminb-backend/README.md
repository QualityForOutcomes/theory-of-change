# Admin Backend

This backend powers admin features like dashboard data, terms management, and newsletter broadcasting/subscription. It runs locally via `dev-server.js` and is deployed as serverless functions.

## Local Development

- Port: `4001` (configurable via `PORT` env)
- CORS: Allows common local origins like `http://localhost:5173`, `http://localhost:5174`, and any origin in `ORIGIN`.
- Dev-only routes in `dev-server.js`:
  - `POST /api/newsletter/subscribe` – fakes success
  - `POST /api/newsletter/send` – simulates dispatch; requires `Authorization: Bearer <token>` and validates subject/html

Start server:

```
cd adminb-backend
npm install
node dev-server.js
```

## Environment Variables

Newsletter sending supports SendGrid or SMTP. Configure one of the transports:

- `SENDGRID_API_KEY` – SendGrid API key (optional; if set, SendGrid is used)
- `NEWSLETTER_FROM_EMAIL` – From email address
- `NEWSLETTER_FROM_NAME` – From display name (defaults to "Quality for Outcomes")
- `SMTP_HOST` – SMTP host (optional)
- `SMTP_PORT` – SMTP port (465 for secure, or other)
- `SMTP_USER` – SMTP username
- `SMTP_PASS` – SMTP password

Supabase configuration (used by endpoints):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (service role for server-side queries)

## Endpoints

### POST `/api/newsletter/subscribe`

- Public endpoint (no admin auth required)
- Body: `{ "email": "user@example.com" }`
- Behavior:
  - Validates email
  - Ensures a `User` row exists for the email
  - Upserts into `UserNewsLetterSubs` with `accepted_at`
- Response: `{ success, message, data: { email, accepted_at } }`

### POST `/api/newsletter/send`

- Admin-only; requires a valid bearer token with `admin` role
- Body: `{ "subject": "...", "html": "<p>...</p>" }`
- Behavior:
  - Fetches subscribers from `UserNewsLetterSubs`
  - Sends via SendGrid or SMTP (prefers SMTP if configured)
  - Returns dispatch summary: `{ total, sent, failed, failures: [] }`

## Notes

- The frontend admin app (`qfo-admin`) uses `VITE_API_URL` to point to this backend.
- The user app (`my-app`) can call `/api/newsletter/subscribe` after registration when users opt-in.
- In development, the dev server simulates success for faster iteration.
