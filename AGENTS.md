# Repository Guidelines

## Project Structure & Module Organization
`src/app` hosts all App Router routes, layouts, API handlers, and server actions. Shared UI stays in `src/components`, reusable hooks in `src/hooks`, and Supabase/Stripe helpers in `src/lib`. Automation scripts (migrations, RLS fixers, seeders) live in `scripts/`, while SQL artifacts and seed data sit in `supabase/`. Static assets go under `public/`, and ad-hoc Playwright/Puppeteer flows remain the root `test-*.js` files.

## Build, Test & Development Commands
- `npm run dev` — start the Turbopack dev server on `localhost:3000`.
- `npm run build && npm run start` — compile and serve the production bundle.
- `npm run lint` — run the shared ESLint + TypeScript config.
- `npm run stripe:webhook[:setup|:list]` — call `src/scripts/setup-stripe-webhooks.ts` to sync endpoints.
- `npm run stripe:products` — seed Stripe catalog data from `src/lib/stripe-config`.
- `node apply-projects-migration.js` — apply Supabase migrations stored in `supabase/`.
Use `npx playwright test` for automated UI checks before shipping.

## Coding Style & Naming Conventions
Default to server components; add `'use client'` only when hooks or browser APIs are required. Keep two-space indentation, camelCase identifiers, kebab-case route folders, and named exports for shared modules. Order Tailwind classes layout → spacing → color → state and rely on `tailwind-merge` helpers to deduplicate utilities. Always run `npm run lint` before pushing.

## Testing Guidelines
Playwright drives regression tests (`npx playwright test`), while Supabase/Stripe smoke tests live in the root `test-*.js` scripts and run via `node <file>`. Name suites after the behavior they guard (`test-auth-rules.js`, `dashboard.spec.tsx`) and colocate component specs inside `__tests__` folders when practical. Use the Supabase service-role key only for isolated tests and execute e2e flows against disposable projects seeded with the SQL files. Focus coverage on authentication, dashboard CRUD, billing, and row-level-security-sensitive paths.

## Commit & Pull Request Guidelines
History favors short, present-tense messages (e.g., `sidebar direita`, `last fixes`); keep that tone, optionally prefixing a scope (`billing: guard usage quota`) and tagging the ticket in brackets. Pull requests should summarize the change, list manual test steps, link the issue, and attach screenshots or Looms for any UI delta. Highlight new env vars, migrations, or background jobs so deployers know what to run.

## Security & Configuration Tips
Store secrets in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, reCAPTCHA keys) and extend `.env.example` when adding variables. Run Stripe/Supabase scripts with least-privilege credentials, re-check policies via `check-rls-policies.js` after schema changes, and scrub user data before sharing logs or screenshots.
