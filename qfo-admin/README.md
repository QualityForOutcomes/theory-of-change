# QFO Admin — Frontend (Vercel)

A Vite + React admin dashboard for Quality for Outcomes, deployed on Vercel. It provides protected access to operational metrics, terms management, and newsletter dispatch. Uses React Router for navigation, React Query for data fetching, and Axios for authenticated API calls.

## Features
- Protected admin shell with JWT handoff from `?token` and unified logout.
- Dashboard metrics: traffic, revenue, subscriptions, premium/pro customer KPIs.
- Terms & Conditions editor with validation and Markdown (`@uiw/react-md-editor`).
- Newsletter broadcast tooling (subscribe and send endpoints).
- Dev proxy for `"/api"` and environment-driven base URL in production.

## Quick Start
- Prerequisites: Node `>=18`, Vercel CLI (`npm i -g vercel`).
- Install deps: `npm install`.
- Create `.env.local` (refer the `.env.example`) in project root with:
  - Frontend: `VITE_API_URL` (admin backend base URL), `VITE_MYAPP_LOGIN_URL` (user app login URL).
  - Optional: `VITE_USE_DASHBOARD_QUICK_STUB`, `VITE_STRIPE_PRO_PRODUCT_ID`, `VITE_STRIPE_PREMIUM_PRODUCT_ID`, `VITE_STRIPE_DASHBOARD_PAYOUT_URL`.
- Run locally: `npm run dev`.
- Or via Vercel: `vercel dev` (uses SPA rewrites from `vercel.json`).
- Build & preview: `npm run build` then `npm run preview`.
- Run tests: `npx vitest run --coverage`.

## Environment Variables
Create a `.env` (see `.env.example`) and set:
- `VITE_API_URL` — Admin backend base URL for production builds. In dev, the app uses relative `"/api"` and the Vite proxy.
- `VITE_MYAPP_LOGIN_URL` — Login page on the user app (e.g. `http://localhost:3000/login` or `https://toc-userfrontend.vercel.app/login`).
- `VITE_USE_DASHBOARD_QUICK_STUB` — Optional (`true|1|yes`) to fetch quick dashboard data via `"/api/dashboard?quick=1"`.
- `VITE_STRIPE_PRO_PRODUCT_ID`, `VITE_STRIPE_PREMIUM_PRODUCT_ID` — Optional product IDs surfaced in UI.
- `VITE_STRIPE_DASHBOARD_PAYOUT_URL` — Optional link for Stripe payout settings; defaults to `https://dashboard.stripe.com/test/settings/payouts`.

Example:
```env
VITE_API_URL=https://toc-adminbackend.vercel.app
VITE_MYAPP_LOGIN_URL=https://toc-userfrontend.vercel.app/login
VITE_USE_DASHBOARD_QUICK_STUB=false
VITE_STRIPE_PRO_PRODUCT_ID=prod_...
VITE_STRIPE_PREMIUM_PRODUCT_ID=prod_...
VITE_STRIPE_DASHBOARD_PAYOUT_URL=https://dashboard.stripe.com/test/settings/payouts
```

## Backend Endpoints (consumed)
- `GET /api/dashboard` — Dashboard data (supports `?quick=1` when `VITE_USE_DASHBOARD_QUICK_STUB` is set).
- `GET /api/admin/terms` — Fetch current terms content and metadata.
- `POST /api/admin/terms` — Update terms content.
- `GET /api/terms/history` — Optional; terms versions/history (if supported by backend).
- `POST /api/newsletter/subscribe` — Subscribe an email to the newsletter.
- `POST /api/newsletter/send` — Broadcast an email with `subject` and `html` body.

Example request bodies:
```json
// POST /api/admin/terms
{ "content": "...markdown or text..." }

// POST /api/newsletter/subscribe
{ "email": "user@example.com" }

// POST /api/newsletter/send
{ "subject": "Updates", "html": "<h1>Hello</h1>" }
```

## Architecture
- Routing: `src/app/routes.jsx`
  - Protects `/admin` routes via `ProtectedRoute` and handles token handoff from `?token=`.
  - Routes: `/admin`, `/admin/dashboard`, `/admin/terms`, `/admin/newsletter`.
- Layout: `src/layouts/AdminLayout.jsx`
  - Header/navigation, logout button; logout clears `localStorage.qfo_token` and redirects to the user app’s `/logout` on `VITE_MYAPP_LOGIN_URL`.
- Auth Guard: `src/routes/ProtectedRoutes.jsx`
  - On first load, reads `?token` and stores `localStorage.qfo_token`.
  - When missing/expired token, hard-redirects to the user app’s `/logout`.
- Data Fetching: React Query
  - `src/features/admin/hooks/useDashboard.js` calls `fetchDashboard` and normalizes via `adaptDashboard`.
- API Client: `src/services/api.js`
  - Axios instance uses bearer token from `localStorage.qfo_token`.
  - Dev base is relative (proxy); prod base is `VITE_API_URL`. On `401`, clears token and redirects to user app logout.
- Services: `src/services/newsletter.js` exposes `newsletterSubscribe`, `newsletterSend`.

## Dev Proxy
`vite.config.js` proxies all `"/api"` routes in dev to:
```js
server: {
  proxy: {
    '/api': {
      target: 'https://toc-adminbackend.vercel.app',
      changeOrigin: true,
      secure: true,
    }
  }
}
```
Axios uses a relative base in dev so requests go through this proxy; in production it uses `VITE_API_URL`.

## Scripts
- `npm run dev` — Start local dev server.
- `npm run build` — Build production bundle to `dist/`.
- `npm run preview` — Preview built app locally.
- `npm run lint` — Run ESLint on the project.

## Testing & Coverage
- Run tests:
  ```bash
  npx vitest run
  ```
- Run coverage and open HTML report:
  ```bash
  npx vitest run --coverage
  open coverage/index.html
  ```
Test config (`vitest.config.ts`) uses `jsdom`, `src/setupTests.js`, and the V8 coverage provider with `text` and `html` reporters.

## Deployment (Vercel)
- Build with `npm run build`; output is in `dist/`.
- SPA rewrites ensure client routing: `/(.*)` → `/index.html`.

`vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- Set environment variables in Vercel → Project Settings → Environment Variables:
  - `VITE_API_URL` → `https://toc-adminbackend.vercel.app`
  - `VITE_MYAPP_LOGIN_URL` → `https://toc-userfrontend.vercel.app/login`
  - Optional: `VITE_USE_DASHBOARD_QUICK_STUB`, `VITE_STRIPE_PRO_PRODUCT_ID`, `VITE_STRIPE_PREMIUM_PRODUCT_ID`, `VITE_STRIPE_DASHBOARD_PAYOUT_URL`
- Production URL: `https://toc-adminfrontend.vercel.app` (preview deployments under `https://toc-adminfrontend-*.vercel.app`).
- Backend CORS already allows the production and preview domains; if you use a custom domain, update backend `ALLOWED_ORIGINS` accordingly.

### Deploy Steps
- Connect the repo in Vercel or run `vercel --prod` from `qfo-admin`.
- Add/verify environment variables, then redeploy if changed.
- Confirm SPA rewrites by testing nested routes (e.g., `/admin/terms`).

## Notes
- If `VITE_MYAPP_LOGIN_URL` is missing, protected routes render a configuration error.
- When testing auth flows, simulate handoff by visiting `/admin?token=YOUR_JWT`.
- In dev, check the terminal for the actual port (commonly `5173` or `5174`).
