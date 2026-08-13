# Business Fact Verification Ledger

Per the project's fact-verification requirement, every claim used anywhere in this app
(seed data, entity statement, future content) is tracked as **VERIFIED**,
**NEEDS VERIFICATION**, or **DO NOT PUBLISH**. This is the source ledger for the
`BusinessFact` and `AuthoritySource` seed rows in `prisma/seed.ts`.

**Important limitation:** `canopycountry.com` is unreachable from this build environment
(network egress to that domain is blocked). Nothing below was confirmed against the
first-party site directly. Everything is from third-party corroboration found via web
search on 2026-08-12. Treat every row as needing a final check against the live site and
dealership staff before anything is published externally.

| Claim | Value found | Evidence source | Status | Notes |
|---|---|---|---|---|
| Business name | Canopy Country RV Center | Yelp, Facebook, RVUSA, Jayco dealer locator | NEEDS VERIFICATION | Consistent across sources; confirm exact legal/DBA name with owner |
| Founding year | 1974 | Provided in project brief; consistent with "landmark in the Yakima Valley" framing found in search results | NEEDS VERIFICATION | Brief states this directly; no independent primary-source document reviewed |
| Original business | Custom-built truck canopies, later expanded into RV sales | Search-result summary referencing canopycountry.com content | NEEDS VERIFICATION | Could not load canopycountry.com directly to confirm wording |
| Address (active location) | 2904 Main St, Union Gap, WA 98903 | Yelp, YellowPages, RVUSA — consistent across 3 independent listings | NEEDS VERIFICATION | Multiple independent sources agree; still confirm against GBP/site directly before publishing |
| Phone | (509) 248-7050 | Yelp | NEEDS VERIFICATION | Only one source captured this specific number; corroborate against GBP |
| Hours | Mon–Fri 8:30am–5:00pm, Sat 9:00am–4:00pm, Sun Closed | Yelp | NEEDS VERIFICATION | Single-source; hours change seasonally at dealerships — confirm current |
| Second location — Ellensburg | "CLOSED" per Yelp listing (2502 W Dolarway Rd, Ellensburg) | Yelp | DO NOT PUBLISH | Do not publish or reference an Ellensburg location as active without explicit owner confirmation |
| Authorized Jayco dealer | Listed on Jayco's official dealer locator | jayco.com/dealers/canopy-country-rv/ | VERIFIED | Manufacturer's own locator is independent, authoritative corroboration |
| Brands carried (current) | Forest River, Jayco, Keystone | canopycountry.com brand pages referenced in search results (Jayco, Jay Feather) + Jayco locator | NEEDS VERIFICATION | Jayco itself is VERIFIED via locator; Forest River/Keystone need same manufacturer-locator-level corroboration |
| Brands carried (historical/uncertain) | Alfa, Coachmen, Fleetwood, Kit, Nu-Wa, Skyline, Western RV | Third-party aggregator summary | DO NOT PUBLISH | Several of these manufacturers (Alfa, Kit, Nu-Wa, Skyline, Western RV) are defunct; likely stale content — do not publish without confirming current lineup |
| RV types sold | Travel Trailers, Fifth Wheels, Toy Haulers, Motorhomes | canopycountry.com inventory/brand URLs seen in search index | NEEDS VERIFICATION | URL structure (`/inventory/...`, `/used/`) corroborates but page content wasn't directly loaded |
| Services offered | Sales, parts department, service department | Third-party dealer summary | NEEDS VERIFICATION | Matches brief's described service lines (repair, parts) but not confirmed against a service-menu page |
| Truck canopies | Sold/installed, per business origin | Project brief + consistent with "Canopy Country" name and founding history | NEEDS VERIFICATION | High plausibility given the name and history, but not confirmed against a current canopy-services page |
| Hitch installation, solar installation | Referenced in project brief's target keyword list | Not independently found in this research pass | NEEDS VERIFICATION | Do not publish as an offered service until confirmed with dealership staff |
| Social presence | Facebook: facebook.com/CanopyCountryRV.Yakima; Instagram: @canopycountryrvcenter | Search index | VERIFIED (existence only) | Confirms the accounts exist; does not verify content/claims made on them |

## Authority Source Graph (seed for `authority_sources`)

| Source | Type | Verification status | Claim(s) it can support |
|---|---|---|---|
| Jayco Dealer Locator | Manufacturer locator | VERIFIED | Authorized Jayco dealer status |
| Yelp Business Listing | Review platform | NEEDS VERIFICATION | Address, phone, hours (single-source per field) |
| Facebook Business Page | Social profile | NEEDS VERIFICATION | Business existence, location, active operation |
| RVUSA Dealer Listing | Industry directory | NEEDS VERIFICATION | Business existence, location |
| YellowPages Listing | Directory | NEEDS VERIFICATION | Address corroboration |
| Google Business Profile | Local platform | NOT YET CHECKED | Would be the strongest source once direct access exists — not queried this session |

## What would move rows from NEEDS VERIFICATION to VERIFIED

1. Direct access to `canopycountry.com` (currently blocked in this environment).
2. Read access to the Google Business Profile listing (authoritative for address/phone/hours).
3. A short confirmation pass from dealership staff on: current brand lineup, whether
   Ellensburg is truly closed, and which services (hitch install, solar) are currently
   offered.

Nothing in `prisma/seed.ts` publishes a `DO NOT PUBLISH` row as fact — those rows exist
in the ledger specifically so the app can *warn against* using them until resolved.
