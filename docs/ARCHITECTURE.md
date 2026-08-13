# Canopy Country Growth OS — Architecture

Project name: **Canopy Country Growth OS**
Repository: `Millionaire-Mind/canopy-country-growth-os`

This document is the required first deliverable: architecture, schema, integration map,
credential list, import strategy, screen map, build sequence, risks, and definition of
done for the V1 weekend build described in the project brief. It was written after
inspecting the (empty) repository and researching publicly available facts about Canopy
Country RV Center before any code was written.

---

## 0. What already exists

The repository was empty (no commits, no branches, no code) at the start of this build.
Direct access to `canopycountry.com` is **blocked by this environment's network egress
proxy** — every fetch attempt returned `EGRESS_BLOCKED`. This is a real constraint, not a
hypothetical one, and it affects Phase 5 (technical SEO audit) and business-fact
verification: those must be completed by someone/something with access to the live site
(the dealership team, or a future session with the domain unblocked), not invented here.

What *is* available from public web search (third-party listings, the manufacturer dealer
locator, social profiles) was used to seed `business_facts` and `authority_sources` with a
realistic verification state — see §9 and `docs/BUSINESS_FACTS.md`. Nothing marked
`VERIFIED` in this build came from a fabricated source; anything that could not be
independently corroborated is marked `NEEDS VERIFICATION`.

---

## 1. Proposed technical architecture

**Principle:** simple, reliable, boring technology that one or two developers can run,
extend, and deploy without a platform team. No microservices, no queues, no ML pipeline.

- **Framework:** Next.js 16 (App Router, TypeScript) — single deployable app serving both
  the dashboard UI and its API routes. Avoids standing up a separate backend for a V1.
  (Started on 14.2 during scaffolding; upgraded immediately after `npm install` flagged
  critical CVEs on that line with no non-breaking patch — see §9.)
- **Database:** Postgres via Prisma ORM (Neon, provisioned through Vercel's Marketplace
  integration in production; any local Postgres in development). Originally scaffolded on
  SQLite for zero-dependency local iteration — deliberately designed so the swap to
  Postgres was a datasource change, not a rewrite (see §11 for the actual production
  readiness pass and why SQLite can't run on Vercel at all). `Lead.status` remains a
  validated string rather than a Postgres enum, to keep that swap minimal.
- **ORM/migrations:** Prisma (schema-as-code, typed client). Schema changes are applied
  with `prisma db push` rather than `prisma migrate` — no migration-history tooling for a
  single-environment V1 this size; see §11 for the tradeoff.
- **UI:** React Server Components + Tailwind CSS. No heavy component library — the
  dashboard is tables, numbers, and status badges, not a design showcase.
- **Auth:** Auth.js (Credentials provider + JWT sessions), per-user staff accounts with no
  self-service signup — accounts are created via `scripts/manage-users.ts`, run locally
  against the production database. Originally scaffolded as a single-shared-password gate
  for the initial structural/testing deployment; replaced before any real customer PII was
  imported, per explicit owner decision — see §11 and `docs/DEPLOYMENT.md` for the full
  design (including the one real limitation: revocation blocks future sign-ins immediately
  but doesn't invalidate an already-issued token before it expires).
- **Charting:** lightweight inline SVG / simple bar-and-number displays — no charting
  dependency needed for V1's funnel and table views.
- **Hosting:** Vercel. See `docs/DEPLOYMENT.md` for exact setup steps.
- **Background jobs:** none in V1. CSV import and fact updates are synchronous, on-demand,
  human-triggered actions — consistent with "no autonomous external actions in V1."

**Why not X:** A full CRM/DMS replacement, a Python/Django stack, or a multi-service
architecture would all violate the "prefer simple reliable infrastructure" and "do not
build features merely because AI can build them" principles for a weekend V1. Next.js +
Postgres/Prisma is the smallest stack that satisfies every V1 screen and every documented
extension point (CSV import today, API integration later).

---

## 2. Repository / file structure

```
canopy-country-growth-os/
├── docs/
│   ├── ARCHITECTURE.md            # this file
│   ├── BUSINESS_FACTS.md          # verified/needs-verification claim ledger
│   └── INTEGRATIONS.md            # credential + access requirements per integration
├── prisma/
│   ├── schema.prisma              # full data model (§4)
│   └── seed.ts                    # SAMPLE DATA + researched business facts
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # nav shell, sample-data banner
│   │   │   ├── page.tsx           # Screen 1 — Executive Command Center
│   │   │   ├── leads/page.tsx     # Screen 2 — Lead Command Center
│   │   │   ├── search/page.tsx    # Screen 3 — Search & Demand Capture
│   │   │   ├── campaigns/page.tsx # Screen 4 — Campaign Opportunities
│   │   │   ├── customers/page.tsx # Screen 5 — Customer Ownership
│   │   │   ├── content/page.tsx   # Screen 6 — Content & Authority Opportunities
│   │   │   └── data-health/page.tsx # Screen 7 — Data Health
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts  # Auth.js handler (sign in/out, callback)
│   │   │   ├── leads/route.ts         # list/create leads (session-protected)
│   │   │   ├── leads/import/route.ts  # CSV importer (session-protected)
│   │   │   └── leads/[id]/route.ts    # update lead status/assignment (session-protected)
│   │   ├── login/page.tsx         # Server Action credentials form
│   │   └── layout.tsx
│   ├── components/                # shared UI (StatTile, FunnelBar, StatusBadge, table)
│   ├── lib/
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── require-session.ts     # API route auth guard (see §11)
│   │   ├── metrics.ts             # funnel/conversion calculations (Engine 1)
│   │   ├── alerts.ts              # opportunity-alert rules (real-data-only)
│   │   ├── integrations.ts        # integration status data (Screen 7)
│   │   ├── content-opportunities.ts # Screen 6 content queue (static, not a DB table)
│   │   └── csv.ts                 # CSV parsing for importer
│   ├── auth.config.ts             # Edge-safe Auth.js config (used by proxy.ts)
│   ├── auth.ts                    # Node-runtime Auth.js config (Credentials, DB checks)
│   └── proxy.ts                   # route-protection gate (Next 16's renamed middleware.ts)
├── scripts/
│   └── manage-users.ts            # create/list/activate/deactivate/delete staff accounts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

This structure keeps each V1 screen as an isolated route, each integration as an isolated
module under `lib/`, and leaves clear extension points (new `app/api/*/route.ts` files,
new `lib/integrations/*.ts` adapters) for Phase-2-and-beyond work without restructuring.

---

## 3. Database schema

Implemented in `prisma/schema.prisma`, following the data model in the brief exactly
(entity names and fields below; Prisma adds `id`/relation plumbing and timestamps where
useful). All twelve entities are included in V1 so later phases don't require schema
churn: `Customer`, `Lead`, `Appointment`, `Sale`, `ServiceOrder`, `RvOwnership`,
`Campaign`, `WebPage`, `SearchPerformance`, `LifecycleEvent`, `BusinessFact`,
`AuthoritySource`.

Key relations:
- `Lead.customerId → Customer`, `Lead.appointmentId → Appointment` (nullable — a lead may
  not yet have an appointment)
- `Sale.customerId → Customer`, `Sale.leadId → Lead` (nullable — walk-in sales have no lead)
- `ServiceOrder.customerId → Customer`, `ServiceOrder.rvId → RvOwnership`
- `RvOwnership.customerId → Customer`
- `SearchPerformance.pageId → WebPage`
- `LifecycleEvent.customerId → Customer`, `LifecycleEvent.rvId → RvOwnership`

`Lead.status` is an enum matching the brief exactly: `NEW, CONTACTED, ENGAGED,
APPOINTMENT, SHOWED, SOLD_RO_OPENED, LOST, NURTURE`.

Every row that is not real dealership data carries `isSampleData: Boolean @default(true)`
so the UI can render a persistent "SAMPLE DATA" badge and so a future real import can be
distinguished from seed data at a glance (Development Principle #3).

---

## 4. Integration map

| Integration | V1 status | What it feeds |
|---|---|---|
| GA4 | NOT CONNECTED | visitor counts, landing page, source/medium for `Lead` |
| Google Search Console | NOT CONNECTED | `SearchPerformance` (Screen 3) |
| Google Business Profile | NOT CONNECTED | local visibility, `AuthoritySource` corroboration |
| Bing Places / Apple Business Connect | NOT CONNECTED | `AuthoritySource` corroboration |
| CRM (unknown product) | IMPORT ONLY (CSV) | `Lead`, `Customer`, `Appointment` |
| DMS (unknown product) | IMPORT ONLY (CSV, future) | `Sale`, `ServiceOrder`, gross profit |
| Call tracking | NOT CONNECTED | phone-lead attribution |
| Website lead forms | NOT CONNECTED (no webhook target yet) | `Lead` |
| Manufacturer dealer locators (e.g. Jayco) | VERIFIED via public locator | `AuthoritySource` |

Every "NOT CONNECTED" row has a matching entry in `docs/INTEGRATIONS.md` explaining
exactly what access/export is required. None of them block V1 — CSV import is the
universal fallback per Development Principle and Phase 2 instructions.

---

## 5. Required credentials / access list

See `docs/INTEGRATIONS.md` for the full table. Summary of what would need to come from the
dealership owner/staff to move past CSV import:

1. **GA4** — read-only access to the GA4 property (Admin → Property Access Management),
   or a service account with Analytics Data API access.
2. **Google Search Console** — read access to the verified `canopycountry.com` property,
   or a service account added as a user.
3. **Google Business Profile** — manager/owner access to the GBP listing.
4. **CRM export** — whatever CRM the sales/service desk uses today (name unknown to this
   build) — either API credentials or a recurring CSV/report export of leads.
5. **DMS export** — sales and repair-order data export (name unknown) for gross profit.
6. **Call tracking** — if a call-tracking vendor is already in use, its API key; if not,
   this is a future decision, not a blocker.
7. **Live site access** — this build environment cannot reach `canopycountry.com` at all
   (egress-blocked). A technical SEO audit (Phase 5 / robots.txt / sitemap / Core Web
   Vitals) needs to be run from an environment that *can* reach the site, or the relevant
   exports (Search Console, PageSpeed Insights report) provided directly.

None of these are fabricated or assumed — this build does not claim any of them are
connected.

---

## 6. Data-import strategy

- **V1:** a CSV importer (`/leads`, "Import CSV" action → `POST /api/leads/import`) accepts
  a lead export with columns mapped to the `Lead`/`Customer` schema. Unmapped columns are
  ignored; required columns (source, created date, interest) are validated with a clear
  per-row error report — no silent partial imports.
- Every imported row is stamped `isSampleData: false` and `source` as given in the file
  (falling back to `UNKNOWN` rather than guessing), so imported data is immediately
  distinguishable from seed data and attribution is never invented.
- Sales/service/RV-ownership CSV importers are the natural Phase-2/3 follow-up using the
  same pattern (`lib/csv.ts` is written generically) — not built this weekend per the
  "don't build features merely because AI can build them" and scope-limiting instructions,
  but the extension point is real and documented.

---

## 7. V1 screen map

| # | Screen | Route | Status this build |
|---|---|---|---|
| 1 | Executive Command Center | `/` | Built — funnel, acquisition table, real-data-only alerts |
| 2 | Lead Command Center | `/leads` | Built — table, status, response time, filtering, CSV import |
| 3 | Search & Demand Capture | `/search` | Stub — "DATA REQUIRED" (needs Search Console) |
| 4 | Campaign Opportunities | `/campaigns` | Stub — opportunity queue shape shown with SAMPLE rows, engine not automated |
| 5 | Customer Ownership | `/customers` | Stub — schema-backed table, lifecycle rules not yet encoded |
| 6 | Content & Authority Opportunities | `/content` | Stub — evidence-driven queue shape, no rows invented |
| 7 | Data Health | `/data-health` | Built — integration status + what's needed per row |

Screens 1, 2, and 7 are "the most important interface" (Phase 3) and the ones a real
CSV import makes immediately useful — they are fully built. Screens 3–6 are scaffolded
with the correct data shape and an explicit "DATA REQUIRED" state rather than invented
numbers, per the instruction to never guess when data are unavailable.

---

## 8. Weekend implementation sequence

1. **Foundation** — Next.js shell, Prisma schema, env config, auth gate, business-fact
   and integration-status tables. *(this build)*
2. **Data ingestion** — CSV lead importer; seed data clearly labeled SAMPLE DATA.
   *(this build)*
3. **Executive dashboard** — funnel, source table, alerts, plain-English summary.
   *(this build)*
4. **Lead command center** — table, status, response time, filters, missed-lead
   highlighting. *(this build)*
5. **Search command center** — deferred until Search Console access exists; stub built.
6. **Customer ownership foundation** — schema + stub screen built; lifecycle-event rules
   deferred until real RV/service data exists to validate rules against.
7. **Opportunity engine** — alert rules in `lib/alerts.ts` are the seed of this; full
   evidence-scored queue deferred until Screens 3–5 have real data to reason over.

---

## 9. Risks / blockers

- **`canopycountry.com` is unreachable from this environment.** All business facts below
  come from third-party corroboration (Yelp, Jayco's dealer locator, Facebook, RVUSA),
  not the first-party site. They are marked `NEEDS VERIFICATION` rather than `VERIFIED`
  where the first-party site would normally be the source of record. See
  `docs/BUSINESS_FACTS.md`.
- **No CRM/DMS/analytics credentials exist yet.** Every acquisition, gross-profit, and
  search metric in the dashboard is SAMPLE DATA until a real import happens. The UI makes
  this unmissable (persistent banner + per-row badges) so nobody mistakes sample rows for
  real performance.
- **Ellensburg location:** public search results show a second historical "Canopy Country
  RV Center – Ellensburg" location marked **CLOSED** on Yelp. This build assumes Union Gap
  (Yakima) is the sole active location and does **not** publish the Ellensburg address as
  current — flagged `DO NOT PUBLISH` in the facts ledger pending owner confirmation.
- **Framework version churn:** Next.js 14.2 (the initial scaffold choice) had unpatched
  critical advisories with no fix on that line; the build was moved to Next 16 (current
  stable) before any code shipped, which meant adapting to its async `params`/
  `searchParams` convention and renaming `middleware.ts` → `proxy.ts`. `npm audit` reports
  0 vulnerabilities on the final dependency set.
- **Brand/manufacturer list uncertainty:** some sources list older brands (Alfa, Kit,
  Nu-Wa, Skyline, Western RV) that may reflect a historical/outdated page. Only
  Forest River, Jayco, and Keystone are corroborated by current sources (Jayco via its own
  dealer locator). The rest are `NEEDS VERIFICATION`.

---

## 10. Exact definition of done (this build)

This V1 slice is done when, using only seeded SAMPLE DATA (clearly labeled) or a real CSV
import, a manager opening the app can:

1. See the revenue funnel with stage-to-stage conversion rates (Screen 1).
2. See acquisition performance by source, including `UNKNOWN` where attribution doesn't
   exist (Screen 1).
3. See real-data-only opportunity alerts, e.g. leads with no human follow-up (Screen 1).
4. See every lead with source, status, response time, and next action, and filter to
   leads needing action (Screen 2).
5. Import a CSV of leads and see them appear in the Lead Command Center with correct
   status/source, without guessed attribution.
6. See the integration status of every data source (GA4, Search Console, GBP, CRM, DMS,
   call tracking, website leads) and, for each disconnected one, what's needed to connect
   it (Screen 7).
7. See Screens 3–6 clearly state **DATA REQUIRED** rather than fabricated numbers.
8. See a persistent, unmissable indicator distinguishing sample data from real data
   everywhere in the app.

Anything beyond this (live integrations, autonomous campaigns, lifecycle automation,
attribution modeling) is explicitly out of scope for this weekend build per the brief.

---

## 11. Production readiness pass (Postgres + real auth)

Before this build was deployed anywhere internet-accessible, two gaps identified during
review were addressed — both by explicit owner decision, not silently:

**Database: SQLite → Postgres.** Vercel's serverless functions have no persistent
writable filesystem — every invocation can land on a different, ephemeral container, so
a SQLite file cannot serve as a shared source of truth in that environment. This isn't a
tuning issue, it's a hard architectural blocker. The fix: `prisma/schema.prisma`'s
datasource is now `postgresql`, with two connection strings — `DATABASE_URL` (pooled,
for normal app queries) and `DIRECT_URL` (unpooled, used only for `prisma db push`, since
DDL over a pooled/pgbouncer-style connection is unreliable). Production uses Neon,
provisioned through Vercel's Marketplace integration — see `docs/DEPLOYMENT.md` for exact
steps. `generator client` also gained `binaryTargets = ["native", "rhel-openssl-3.0.x"]`,
a known requirement for Prisma's query engine to be found on Vercel's runtime.

Schema changes are applied with `prisma db push` rather than `prisma migrate`. That's a
deliberate scope call for a single-environment V1 this size — migration-history tooling
is real value once there's a team coordinating schema changes across environments, but
adds ceremony this project doesn't need yet. `npm run db:reset` was fixed to match this
(`prisma migrate reset` silently produced an empty, tableless database with no migrations
folder to replay — caught during this pass; it now uses `prisma db push --force-reset`).

**Auth: shared password → per-user accounts.** The original single-shared-password gate
was appropriate for a same-day structural preview with sample data, and was flagged at
the time as needing replacement before real customer PII arrived (§1's original text).
That replacement happened in this pass, before any real data was imported:

- Auth.js (`next-auth@5`, Credentials provider, JWT sessions) replaced the hand-rolled
  HMAC-cookie system (`src/lib/auth.ts`, `/api/login`, `/api/logout` — all removed).
- A new `User` model (`prisma/schema.prisma`) holds staff accounts — email, bcrypt
  password hash, `isActive` flag — kept entirely separate from `Customer` (the
  dealership's own customers/leads); the two must never be conflated.
- No self-service signup and no in-app admin UI (that would have been new scope, and an
  open signup endpoint is a real risk for an app holding PII). Accounts are managed via
  `scripts/manage-users.ts`, run locally by whoever holds the production `DATABASE_URL`.
- Config is split `auth.config.ts` (Edge-safe, no Prisma — used by `proxy.ts`) /
  `auth.ts` (Node runtime, does the actual Prisma-backed credential and `isActive`
  checks) because Prisma's Postgres driver needs a real TCP connection, which isn't
  available on Vercel's Edge runtime.
- **Revocation, honestly stated:** Credentials + JWT sessions cannot use Auth.js's
  database session strategy (Auth.js doesn't support that pairing). So `isActive` is
  re-checked against the database on every request that reaches the Node runtime — the
  `jwt` callback in `auth.ts`, invoked from `(dashboard)/layout.tsx` on every dashboard
  page load, and from `src/lib/require-session.ts` on every protected API route. That
  means deactivating a user blocks their next page load or API call immediately. What it
  does *not* do is invalidate a token that's still cached client-side between requests —
  session `maxAge` is capped at 12 hours specifically to bound that window. This is a
  real, documented tradeoff, not an oversight.

Full deployment mechanics (exact Vercel dashboard steps, environment variables, cost) are
in `docs/DEPLOYMENT.md` rather than duplicated here.
