# Theory of Change Visualization Tool - Frontend

TypeScript React application for creating and managing Theory of Change diagrams, designed for Vercel deployment. It provides JWT-based authentication, project management, subscription handling with Stripe, and real-time visualization with export capabilities.

## Features

* **Auth**: Login, registration, password reset, Google OAuth, JWT session management
* **Projects**: Create, list, view, update, delete Theory of Change projects with auto-save
* **Visualization**: Interactive card-based diagrams with color customization and export (PDF/Image)
* **Subscriptions**: Stripe integration for Free/Pro/Premium tiers with feature-based access control
* **Support**: In-app support panel for Pro/Premium users, newsletter subscription
* **Admin**: Terms & Conditions management, role-based routing

## Quick Start

**Prerequisites**: Node `>=14`, npm, Backend API running

**Install dependencies**:
```bash
npm install
```

**Create `.env` in project root**:
```env
REACT_APP_PAYMENT_API_BASE=http://localhost:3003
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_your_stripe_key
```

**Run locally**:
```bash
npm start
```
Opens at [http://localhost:3000](http://localhost:3000)

**Run tests**:
```bash
npm test -- --coverage --watchAll=false
```

## Scripts

* `npm start` — development server with hot reload
* `npm test` — run tests in watch mode
* `npm test -- --coverage --watchAll=false` — tests with coverage
* `npm run build` — production build to `build/` folder
* `npm run test:coverage` — alias for coverage report

## Application Routes

### Public Routes
* `/login` — User login
* `/signup` — User registration  
* `/forgot-password` — Password reset request
* `/reset-password` — Password reset with token
* `/terms` — Terms & Conditions

### Protected Routes (Authenticated)
* `/app` — Main workspace (FormPanel + VisualPanel)
* `/projects` — Project list and management
* `/profile` — User profile and subscription details
* `/subscription-plans` — Pricing and upgrade options
* `/subscription-success` — Payment confirmation

### Admin Routes
* `/admin/terms` — Edit Terms & Conditions (admin only)

```

## API Integration (`services/api.ts`)

### Authentication
* `POST /api/auth/login` — Body: `{ email, password }` → Returns: `{ token, user }`
* `POST /api/user/create` — Registration with T&C acceptance
* `POST /api/auth/reset-password` — Password reset flow
* `POST /api/auth/google` — Google OAuth login

### Projects
* `GET /api/project/list` — Fetch user's projects
* `GET /api/project/get` — Get specific project by ID
* `POST /api/project/create` — Create new project (authenticated)
* `PUT /api/project/update` — Save project changes (authenticated)
* `DELETE /api/project/delete` — Remove project (authenticated)

### Users
* `GET /api/user/get` — Header: `Authorization: Bearer <token>` → Returns profile
* `PUT /api/user/update` — Update user information (authenticated)

### Subscriptions
* `GET /api/subscription/get` — Fetch subscription details (authenticated)
* `POST /api/subscription/create` — Create subscription via Stripe (authenticated)
* `PUT /api/subscription/update` — Update subscription tier (authenticated)

## Component Architecture

### Smart Components (State Management)
* **FormPanel**: Manages form state, validation, dynamic fields
* **VisualPanel**: Handles diagram state, color customization, card limits
* **Nav**: Conditional rendering based on auth status and subscription tier
* **SupportPanel**: Contact form with email integration

### Presentational Components
* **AuthCard**: Styled wrapper for auth forms
* **Toast**: Notification system (success/error/info)
* **ValidationHints**: Real-time form validation feedback
* **ConfirmModal**: Confirmation dialogs for destructive actions

## Environment Variables

**Required**:
* `REACT_APP_PAYMENT_API_BASE` — Backend API URL (e.g., `http://localhost:3003` or production URL)
* `REACT_APP_STRIPE_PUBLIC_KEY` — Stripe publishable key for payment processing

⚠️ **Security**: Variables prefixed with `REACT_APP_` are embedded in build and visible to users. Never store secrets here.

## Subscription Tiers

| Tier | Features | Price |
|------|----------|-------|
| **Free** | 3 projects, basic export, community support | $0 |
| **Pro** | 7 projects, image export, email support | $X/month |
| **Premium** | Unlimited projects, high-res PDF export, priority support | $Y/month |

Feature access controlled via `userPlan` state and API validation.

## Navigation Rules

### Nav Component Behavior
**Not Logged In**: Shows Home, Login, Sign Up  
**Free User**: Shows Home, Projects, Profile, Logout (no Support)  
**Pro/Premium User**: Shows Home, Projects, Profile, Support, Logout

### Footer Component Behavior
**Shows On**: `/login`, `/signup`  
**Hidden On**: All other routes (app, projects, profile, etc.)

**Reason**: Footer contains legal links important during signup but takes space in main app.

## Deployment

**Build for production**:
```bash
npm run build
```

**Deploy to Vercel**:
```bash
vercel --prod
```

**Environment setup in Vercel**:
1. Set `REACT_APP_PAYMENT_API_BASE` to production backend URL
2. Set `REACT_APP_STRIPE_PUBLIC_KEY` to production Stripe key
3. Deploy from `main` branch or via CLI

## Testing & Coverage

* **Test Framework**: Jest + React Testing Library
* **Coverage**: Component tests, API integration tests, validation tests, E2E flows
* **Global threshold**: Branches ~70%

**Run tests with coverage**:
```bash
npm test -- --coverage --watchAll=false
```

**View HTML report**:
```bash
open coverage/lcov-report/index.html
```

**Test categories**:
* Component tests (UI rendering, interactions)
* Service tests (API calls with mocked responses)
* Page tests (full route rendering)
* Integration tests (auth flow, subscription flow, project CRUD)

