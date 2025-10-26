# QFO Admin — Quick Start

A lightweight React + Vite admin dashboard. This guide gives simple, practical steps to set up, run, test, and build the app.

## Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+ (or use `pnpm`/`yarn` if preferred)

## 1) Install
```bash
# from repo root
cd qfo-admin
npm install
```

## 2) Configure Environment
- Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
- Fill in any required values in `.env` (e.g., API URLs, auth keys). If unsure, start with defaults and adjust when connecting to your backend.

## 3) Run in Development
```bash
npm run dev
```
- Open the printed URL (usually `http://localhost:5173/`).
- Hot Reload (Fast Refresh) is enabled via `@vitejs/plugin-react`.

## 4) Lint
```bash
npm run lint
```
- Ensures code quality using ESLint. Fix issues as reported in the terminal.

## 5) Test (Vitest)
Vitest is installed. If you want to run tests:
```bash
npx vitest
# or for UI mode
npx vitest --ui
```
- Test files live under `__tests__` or `*.test.ts(x)` (if present).

## 6) Build for Production
```bash
npm run build
```
- Outputs production assets to `dist/`.
- To preview the build locally:
```bash
npm run preview
```

## Project Notes
- Tooling: React 19, Vite 7, React Router, Axios, TanStack Query, TailwindCSS.
- Styling: TailwindCSS is included; add your styles in `src/` as needed.
- Routing: Pages are under `src/`; update routes in the router configuration.
- API: Use Axios clients; configure base URLs via `.env` when needed.

## Troubleshooting
- Port in use: set a different port with `--port` (e.g., `npm run dev -- --port=5174`).
- Env not loaded: ensure `.env` exists and values are correct; restart the dev server after changes.
- Node version: verify `node -v` is 18+.

## Scripts (package.json)
- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint

## Deployment
- The project includes `vercel.json`. For Vercel deployment:
  - Connect the repo to Vercel and set required env vars.
  - Use the default build command (`npm run build`), output `dist/`.

That’s it — you’re ready to develop and ship QFO Admin.
