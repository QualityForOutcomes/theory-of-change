# toc-user-backend

TypeScript serverless backend for TOC applications, designed for Vercel. It provides JWT-based auth, user and session management via Supabase, project storage in MongoDB, subscription endpoints, and a password reset flow using Nodemailer.

## Features
- Auth: `POST /api/auth/login`, Google OAuth via Firebase Admin, JWT middleware
- Users: registration, profile retrieval, updates, sessions
- Projects: create, list, get, update using MongoDB
- Subscriptions: create and get subscription data
- CORS: origin whitelist via `ALLOWED_ORIGINS`

## Quick Start
- Prerequisites: Node `>=18`, Vercel CLI (`npm i -g vercel`)
- Install deps: `npm install`
- Create `.env.local`(refer the .env.example) in project root with:
  - Core: `JWT_SECRET`, `ALLOWED_ORIGINS`
  - Supabase: `TOC_SUPABASE_URL`, `TOC_SUPABASE_SERVICE_ROLE_KEY`
  - MongoDB: `MONGODB_URI`, `MONGODB_DB`, `MONGODB_COLLECTION_NAME` (optional, defaults to `projects`), `NODE_ENV`
  - Google OAuth: `FIREBASE_ADMIN_KEY` (stringified service account JSON)
  - Email (password reset): `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `GMAIL_SENDER_NAME`
- Run locally: `vercel dev`
- Run tests: `npm run test:coverage`

## Scripts
- `npm test` — run all tests
- `npm run test:coverage` — tests with coverage (global threshold ~70% branches)
- `npm run test:verbose` — verbose test output
- `npm run test:create` — run user create API tests only

## API Endpoints

### Auth
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Returns: `{ token, user }`
  - Example:
    ```bash
    curl -X POST $API_URL/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"email":"user@example.com","password":"secret"}'
    ```

- `POST /api/auth/google`
  - Body: `{ idToken }`
  - Requires `FIREBASE_ADMIN_KEY`; returns `{ token, user }`

- `POST /api/auth/reset-password`
  - Request reset: `{ action: 'request-reset', email }`
  - Verify token: `{ action: 'verify-token', email, token, newPassword }`

### Users
- `POST /api/user/create`
  - Body: `{ email, password, username, firstName, lastName, organisation, acceptTandC, newsLetterSubs }`

- `GET /api/user/get`
  - Header: `Authorization: Bearer <token>`; returns profile

- `PUT /api/user/update`
  - Header: `Authorization: Bearer <token>`
  - Body (partial updates): `{ username?, firstName?, lastName?, organisation?, avatarURL? }`

### Projects
- `GET /api/project/get`
  - Query: `projectId` optional; filters: `type`, `status`, `limit`, `page`

- `GET /api/project/list`
  - Minimal project list (id/name)

- `POST /api/project/create` — authenticated
  - Body: `{ userId (from token), projectTitle, bigPictureGoal?, projectAim?, objectives?, beneficiaries?, activities?, outcomes?, externalFactors?, evidenceLinks?, status?, tocColor? }`

- `PUT /api/project/update` — authenticated
  - Body: `{ userId (from token), projectId, projectTitle, updateName?, tocData?, status?, tocColor? }`

### Subscriptions
- `GET /api/subscription/get` — authenticated; optional `subscriptionId`
- `POST /api/subscription/create` — authenticated

## Project Structure
- `api/` — Vercel functions (HTTP handlers)
- `services/` — application services (users, projects, subscriptions)
- `utils/` — helpers (Supabase, MongoDB, CORS, responses)
- `validators/` — input validation
- `middleware/` — JWT auth (`validateToken`)
- `entities/`, `dto/` — typed request/response and data models

## Environment
- `ALLOWED_ORIGINS` controls CORS; set comma-separated origins (e.g., `http://localhost:3000,https://yourapp.com`).
- `JWT_SECRET` must be strong in production (dev fallback is only for tests/local).
- Supabase uses service role key for backend operations; treat `TOC_SUPABASE_SERVICE_ROLE_KEY` as sensitive.
- Password reset uses Gmail SMTP via Nodemailer. Use an app password for `GMAIL_APP_PASSWORD`.
- MongoDB requires `MONGODB_URI` and `MONGODB_DB`; `MONGODB_COLLECTION_NAME` is optional with default `projects`.

## Deployment
- Set all env vars in Vercel project settings.
- Ensure MongoDB Atlas or your DB is reachable with `MONGODB_URI`.
- Rotate secrets periodically and restrict origins.
- Recommended Vercel settings:
  - Build command: `npm run build` (if configured) or rely on serverless functions
  - Dev: `vercel dev` uses `.env.local`

## Testing & Coverage
- Jest + ts-jest (`node` env), collecting coverage from `api`, `services`, `utils`, `validators`, `middleware`.
- Global coverage thresholds enforced (`branches ~70%`).

## Notes
- `.env.local` files are ignored by Git (`.gitignore`).
- Authenticated routes require `Authorization: Bearer <token>`.
- Database tables for users/sessions live in Supabase; projects live in MongoDB.
