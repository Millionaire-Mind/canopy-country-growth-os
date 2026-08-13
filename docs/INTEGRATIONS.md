# Integration Requirements

For every data source Canopy Country Growth OS can eventually use, this table states what
data is missing without it, why it matters, exactly what access is required, and whether a
CSV import can temporarily substitute. Nothing here is connected in this build — see
`/data-health` in the app for live status, which reads this same reasoning.

| Integration | Missing data | Why it matters | Access required | CSV fallback |
|---|---|---|---|---|
| **GA4** | Visitor counts, session source/medium, landing page, on-site behavior | Needed for Visitor→Lead conversion rate, true funnel top-of-funnel | Add a service account (or the operator's Google account) as a **Viewer** on the GA4 property, plus enable the Analytics Data API on a GCP project | No — GA4 data isn't exportable as a clean recurring CSV in a way that supports trend analysis; API access is the real fix |
| **Google Search Console** | Query, clicks, impressions, CTR, position per page | Needed for Screen 3 (Search & Demand Capture) — which searches actually produce opportunities | Add the operator/service account as a **full or restricted user** on the verified `canopycountry.com` property | Partial — Search Console supports manual CSV export of the Performance report; usable for a point-in-time load, not automatic refresh |
| **Google Business Profile** | Views, calls, direction requests from Maps/Search, Q&A, review volume | Local visibility is a primary demand-capture channel for "near me" and service queries | Manager access on the GBP listing for the account running this app | No — GBP insights aren't CSV-exportable in a reusable way |
| **CRM** (product unknown) | Lead records, assignment, response timestamps, lost reasons | This is the core of Engine 2 (lead recovery) — without it, response-time and follow-up tracking is impossible | Either API credentials for the specific CRM in use, or a recurring lead export (CSV/Excel) from the sales desk | **Yes** — built this weekend (`/leads` → Import CSV) |
| **DMS** (product unknown) | Sale price, front/F&I gross, repair-order revenue and gross profit | Needed for every gross-profit and CAC calculation in Engine 1 | DMS vendor's export/reporting feature, or API credentials if the DMS supports them | Yes, planned — same CSV pattern as leads, not built this weekend (Development Principle: don't build what isn't needed yet) |
| **Call tracking** | Which calls came from which source/campaign | Phone is a major RV-buyer channel; without this, all phone leads attribute to `UNKNOWN` | API key from whichever call-tracking vendor is chosen (none confirmed in use) | No — call tracking is inherently a live-routing service |
| **Website lead forms** | Structured lead capture with source/landing-page metadata at submission time | This is the "immediately acknowledge, start response timer" workflow in Engine 2 | A webhook or form-handler pointing form submissions at `POST /api/leads` | Yes, as an interim measure via periodic CSV export from whatever form tool is in use |
| **Manufacturer dealer locators** (e.g. Jayco) | Independent corroboration of dealer status/brands carried | Feeds the Entity Evidence Graph — real third-party proof, not marketing copy | None — these are public and already checked (see `BUSINESS_FACTS.md`) | N/A |
| **Live site (`canopycountry.com`)** | robots.txt, sitemap, indexability, Core Web Vitals, on-page SEO | Needed for the technical SEO audit portion of Engine 3 | This build environment's network egress is blocked for this domain. Either run the audit from an unblocked environment, or provide a PageSpeed Insights / Search Console export directly | Partial — PSI/Lighthouse reports can be manually attached |

## Priority for Phase 2 (next session with credentials)

1. Website lead form webhook → `/api/leads` (closes the loop on real-time lead capture)
2. CRM export → CSV import (fastest path to real acquisition-performance data)
3. Search Console read access (fills in Screen 3 with real query/page data)
4. GA4 read access (completes the funnel's top of the visitor stage)
5. DMS export (unlocks every gross-profit and true-ROI calculation)
