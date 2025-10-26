# QFO Admin — Frontend

A Vite + React admin dashboard for Quality for Outcomes. Provides protected access to operational metrics, terms management, and newsletter dispatch. Uses React Router for navigation and React Query for data fetching, with Axios for API calls.

## Quick Start

- Prerequisites: Node 18+ and npm.
- Install:
  ```bash
  cd qfo-admin
  npm install
  ```
- Run dev server:
  ```bash
  npm run dev
  ```
  The server starts on `http://localhost:5173` (or the next available port shown in the terminal). In development, all `"/api"` requests are proxied to the admin backend.
- Build & preview:
  ```bash
  npm run build
  npm run preview
  ```
- Lint:
  ```bash
  npm run lint
  ```

## Environment Variables
Create a `.env` (see `.env.example`) and set:

- `VITE_API_URL` — Admin backend base URL for production builds. In dev, the app uses relative `"/api"` and the Vite proxy.
- `VITE_MYAPP_LOGIN_URL` — Login page on the user app (e.g. `http://localhost:3000/login` or `https://toc-userfrontend.vercel.app/login`).
- `VITE_USE_DASHBOARD_QUICK_STUB` — Optional (`true|1|yes`) to fetch quick dashboard data via `"/api/dashboard?quick=1"`.
- `VITE_STRIPE_PRO_PRODUCT_ID`, `VITE_STRIPE_PREMIUM_PRODUCT_ID` — Optional product IDs surfaced in UI.
- `VITE_STRIPE_DASHBOARD_PAYOUT_URL` — Optional link used by the dashboard to open Stripe payout settings. Defaults to `https://dashboard.stripe.com/test/settings/payouts`.

Example:
```env
VITE_API_URL=https://toc-adminbackend.vercel.app
VITE_MYAPP_LOGIN_URL=http://localhost:3000/login
VITE_USE_DASHBOARD_QUICK_STUB=false
VITE_STRIPE_PRO_PRODUCT_ID=prod_...
VITE_STRIPE_PREMIUM_PRODUCT_ID=prod_...
```

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

## Architecture

- Routing: `src/app/routes.jsx`
  - Uses `ProtectedRoute` to guard the admin shell and handle token handoff from `?token=`.
  - Routes:
    - `/admin` and `/admin/dashboard` → `AdminDashboard`
    - `/admin/terms` → `TermsManagement`
    - `/admin/newsletter` → `Newsletter`
- Layout: `src/layouts/AdminLayout.jsx`
  - Header with navigation, logout button, and shell layout.
  - Logout clears `localStorage.qfo_token` and redirects to the user app’s `/logout` on `VITE_MYAPP_LOGIN_URL`.
- Auth Guard: `src/routes/ProtectedRoutes.jsx`
  - On first load, reads `?token` from the URL and stores it as `localStorage.qfo_token`.
  - When no token, redirects to the user app’s `/logout` (ensures unified sign-out).
- Data Fetching: React Query
  - `src/features/admin/hooks/useDashboard.js` calls `fetchDashboard` and normalizes data via `adaptDashboard`.
- API Client: `src/services/api.js`
  - Axios instance with bearer token from `localStorage.qfo_token`.
  - Dev base is relative (proxy), prod base is `VITE_API_URL`.
  - On `401`, clears token and hard redirects to the user app’s logout.
- Features:
  - `AdminDashboard.jsx`: KPIs, charts (Recharts), revenue, subscriptions list.
  - `TermsManagement.jsx`: fetch/edit/validate Terms & Conditions; includes a Markdown editor (`@uiw/react-md-editor`).
  - `Newsletter.jsx`: broadcast tool calling `POST /api/newsletter/send`.
- Services:
  - `src/services/newsletter.js`: `newsletterSubscribe`, `newsletterSend`.

## Styling
Primarily inline styles with CSS variables (`src/index.css`). Tailwind CSS v4 is available in devDependencies; use as preferred. Iconography via `lucide-react`; charts via `recharts`.

## Deployment
- Build with `npm run build`; output is in `dist/`.

### Vercel
- Uses `vercel.json` for SPA hosting.
- Build command: `npm run build`
- Output directory: `dist`
- SPA rewrites: `/(.*)` → `/index.html` to support client-side routing.

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
  - Optional: `VITE_USE_DASHBOARD_QUICK_STUB`, `VITE_STRIPE_PRO_PRODUCT_ID`, `VITE_STRIPE_PREMIUM_PRODUCT_ID`
- Production URL: `https://toc-adminfrontend.vercel.app` (preview deployments under `https://toc-adminfrontend-*.vercel.app`).
- Backend CORS already allows the production and preview domains; if you use a custom domain, update backend `ALLOWED_ORIGINS` accordingly.
- API calls use `VITE_API_URL`; do not rely on dev proxy in production.

### Deploy Steps
- Connect the repo in Vercel or run `vercel --prod` from `qfo-admin`.
- Add/verify environment variables, then redeploy if changed.
- Confirm the SPA rewrite works by testing nested routes (e.g., `https://toc-adminfrontend.vercel.app/admin/terms`).

## Notes
- If `VITE_MYAPP_LOGIN_URL` is missing, protected routes render a configuration error.
- In dev, check the terminal for the actual port (commonly `5173` or `5174`).
- When testing auth flows, you can simulate handoff by visiting `/admin?token=YOUR_JWT`.
