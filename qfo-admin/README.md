# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## QFO Admin Dev Setup

- Start frontend: `npm run dev` → `http://localhost:5173`
- Start backend: from `adminb-backend`, run `node dev-server.js` (listens on `http://localhost:4001`)

### API Proxy

- `vite.config.js` proxies `'/api'` to `http://localhost:4001`.
- In development, `src/services/api.js` sets Axios `baseURL` to `/` so requests go through the proxy.

### Auth in Development

- `./.env.development` may set `VITE_DEV_BYPASS_AUTH=true` to bypass ProtectedRoute locally.
- Backend `.env` can set `DISABLE_AUTH=1` to skip external token verification while testing.

### Quick Checks

- `http://localhost:5173/api/hello` → 200 `{ message: "Hello World!" }`
- `http://localhost:5173/api/dashboard` → 200 with message:
  - `Dashboard data retrieved successfully` (live when Stripe keys configured), or
  - `Demo dashboard (no STRIPE_SECRET_KEY configured)` (demo-backend fallback).
