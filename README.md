# Canopy Country Growth OS

Customer acquisition & RV ownership growth operating system for Canopy Country RV
Center (Yakima Valley / Central Washington).

This is the V1 weekend build described in `docs/ARCHITECTURE.md` — a command center that
answers, from real data or a clear **DATA REQUIRED** flag, where the dealership is making
money, where opportunities are being lost, and what needs human action today. It is not
an SEO dashboard: SEO, social, paid, and AI/GEO are subsystems underneath a single
customer-lifecycle system (dream → research → buy → own → maintain → repeat).

Read `docs/ARCHITECTURE.md` first — it covers the technical architecture, database
schema, integration map, credential requirements, screen map, build sequence, risks, and
definition of done for this build. Deploying to Vercel? See `docs/DEPLOYMENT.md`.

## What's included

- **Screen 1 — Executive Command Center** (`/`): revenue funnel, acquisition performance
  by source, real-data-only opportunity alerts.
- **Screen 2 — Lead Command Center** (`/leads`): every lead with source, status, response
  time, and next action; CSV import for CRM data with no live integration yet.
- **Screen 3 — Search & Demand Capture** (`/search`): stub — states DATA REQUIRED because
  Google Search Console isn't connected.
- **Screen 4 — Campaign Opportunities** (`/campaigns`): opportunity queue shape, seeded
  with two illustrative SAMPLE opportunities (winterization push, aging-inventory
  merchandising) drawn directly from the brief's own event-based-marketing examples.
- **Screen 5 — Customer Ownership** (`/customers`): RV ownership + service history +
  lifecycle-event foundation.
- **Screen 6 — Content & Authority Opportunities** (`/content`): evidence-driven content
  queue plus the business-fact verification ledger and authority evidence graph.
- **Screen 7 — Data Health** (`/data-health`): integration status for every data source,
  with exactly what's missing and what access would be required to connect it.

Every screen distinguishes real data from SAMPLE DATA (persistent banner + row-level
badges) and never fabricates a number it doesn't have.

## Getting started

Requires a Postgres database (local Postgres for development, Neon in production — see
`docs/DEPLOYMENT.md`).

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET
npm run db:push           # syncs prisma/schema.prisma to your Postgres database
npm run db:seed           # loads SAMPLE DATA + researched business facts
npm run user:create -- --email you@example.com --name "Your Name"   # prints a one-time password
npm run dev
```

Visit `http://localhost:3000` and sign in with the email/password the `user:create` command
printed. There is no self-service signup — every account is created deliberately via the
`user:*` scripts (`npm run user:list` / `user:activate` / `user:deactivate` / `user:delete`),
since this app holds customer PII. See `docs/DEPLOYMENT.md` for why.

To reset the database back to a clean seeded state at any point: `npm run db:reset`. This
drops and recreates every table, **including `users`** — you'll need to re-run
`npm run user:create` afterward. Use it only against your local/dev database, never
against production.

## Importing real leads

Lead Command Center → **Import CSV**. Expected columns: `firstName, lastName, email,
phone, source, department, interestType, landingPage, createdAt`. Unknown/missing
`source` is stored as `UNKNOWN`, never guessed. See `docs/INTEGRATIONS.md` for the CRM/DMS
access this would eventually replace.

## Important limitations of this build

- **No live integrations are connected.** GA4, Search Console, Google Business Profile,
  CRM, DMS, and call tracking are all `NOT CONNECTED` or `IMPORT ONLY` — see `/data-health`
  and `docs/INTEGRATIONS.md` for exactly what's needed to change that.
- **`canopycountry.com` was unreachable from the build environment** (network egress
  blocked). Every business fact in `docs/BUSINESS_FACTS.md` and the seeded
  `business_facts` table comes from third-party corroboration, not the first-party site,
  and is marked `NEEDS_VERIFICATION` accordingly — nothing is presented as more certain
  than it is.
- **No autonomous external actions.** Nothing in this build sends email/SMS, posts to
  social, or changes pricing/inventory on its own — per the brief, human approval is
  required for all of that in V1.
- **Auth is per-user (Auth.js, email + password), not a shared password.** Accounts are
  created via `npm run user:create` — there's no self-service signup. See
  `docs/DEPLOYMENT.md` for how sessions, protected routes, and access revocation work,
  including one real limitation: revoking a user blocks their next sign-in immediately,
  but an already-issued session token stays valid until it expires (max 12 hours).

## Tech stack

Next.js 16 (App Router, TypeScript) · Prisma + Postgres (Neon in production, any Postgres
locally) · Auth.js (Credentials + JWT, per-user accounts) · Tailwind CSS. No external
services beyond the database, no background jobs, no ML pipeline — see
`docs/ARCHITECTURE.md` §1 for why.
