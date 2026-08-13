# Deploying to Vercel

This is a beginner-friendly, click-by-click walkthrough. It assumes you have a GitHub
account (you already do — this repo lives there) and are willing to create a free Vercel
account. No command-line work is required for the deploy itself; the one CLI step is
creating your own staff login after the app is live.

Read `docs/ARCHITECTURE.md` §11 first if you want the "why" behind these choices
(Postgres via Neon, per-user Auth.js accounts) — this doc is just the "how."

---

## 1. Create the Vercel project

1. Go to [vercel.com](https://vercel.com) and sign up/log in — "Continue with GitHub" is
   the simplest option and is what the rest of these steps assume.
2. Click **Add New… → Project**.
3. Under "Import Git Repository," find `Millionaire-Mind/canopy-country-growth-os` and
   click **Import**. (If it's not listed, click "Adjust GitHub App Permissions" and grant
   Vercel access to this repository.)
4. On the configuration screen:
   - **Framework Preset:** should auto-detect as "Next.js" — leave it.
   - **Root Directory:** leave as `./`.
   - **Branch:** change this to `claude/canopy-country-rv-growth-998gm4` (Vercel deploys
     `main` by default, but that branch doesn't have this code — either deploy this branch
     directly, or merge it into `main` first via a pull request and deploy `main` instead).
5. **Do not click Deploy yet** — go to step 2 first, since the app will fail to build
   without a database connection.

## 2. Add the Postgres database (Neon)

1. Still inside your new Vercel project, go to the **Storage** tab.
2. Click **Create Database**.
3. Choose **Neon** (Serverless Postgres) from the marketplace options.
4. Pick the **Free** plan (see `docs/ARCHITECTURE.md` §11 / the cost discussion above for
   why this comfortably covers V1 usage).
5. Click **Connect** — choose to connect it to your project. Vercel will automatically
   add Postgres-related environment variables to your project for you.
6. Go to your project's **Settings → Environment Variables** and find the variables Neon
   just added (names vary slightly by integration version — look for one that's a
   *pooled* connection string, usually containing `-pooler` in the hostname, and one that
   isn't). You need to make sure two specific variable names exist, because that's what
   this app's code reads:
   - `DATABASE_URL` — set this to the **pooled** connection string.
   - `DIRECT_URL` — set this to the **unpooled/direct** connection string.

   If Neon already created variables with these exact names, you're done. If it created
   differently-named ones (e.g. `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING`), just add
   two more variables named `DATABASE_URL` and `DIRECT_URL` and paste in the matching
   values — this app doesn't care what Neon calls its own variables, only what's named
   `DATABASE_URL` and `DIRECT_URL`.

## 3. Add the auth secret

1. On your own computer (or in this repo), generate a secret:
   ```bash
   npx auth secret
   ```
   (or `openssl rand -base64 33` if you don't have Node installed locally — either
   produces a suitable random string.)
2. In Vercel **Settings → Environment Variables**, add:
   - **Name:** `AUTH_SECRET`
   - **Value:** the string you just generated
   - **Environments:** Production, Preview, and Development (check all three)

This is the only secret you personally need to create. Nothing else needs to be typed in
by hand — the database variables came from step 2.

## 4. Deploy

1. Go to the **Deployments** tab and click **Deploy** (or push a new commit — either
   triggers a build).
2. Wait for the build to finish (a few minutes). If it fails, check the build log — the
   most likely cause is one of the two database environment variables being named wrong
   or missing (see step 2.6).
3. Once it succeeds, the schema still needs to be created in the new database — Vercel's
   build does **not** run `prisma db push` automatically (that's intentional: applying
   schema changes to a live database isn't something that should happen silently on every
   deploy). From your own computer:
   ```bash
   git clone https://github.com/Millionaire-Mind/canopy-country-growth-os -b claude/canopy-country-rv-growth-998gm4
   cd canopy-country-growth-os
   npm install
   ```
   Create a `.env` file (copy `.env.example`) and paste in the **same** `DATABASE_URL` and
   `DIRECT_URL` values you put into Vercel (copy them from the Vercel dashboard — this is
   the one place a real secret needs to briefly exist outside Vercel, on your own machine,
   in a file that's already gitignored). Then run:
   ```bash
   npm run db:push
   ```
   This creates all the tables in your real Neon database.

## 5. Create your first login

Still from that same local checkout, with `.env` pointed at the real database:

```bash
npm run user:create -- --email you@yourcompany.com --name "Your Name"
```

This prints a one-time generated password. Save it somewhere safe (a password manager) —
it is not stored anywhere in plaintext and cannot be retrieved again; if you lose it, run
the same command again to reset it (it upserts by email).

To add more staff accounts later, run the same command with their email. To remove
someone's access: `npm run user:deactivate -- --email them@yourcompany.com` (blocks their
next sign-in immediately; see the revocation note in `docs/ARCHITECTURE.md` §11 for the
one caveat). Full command list is in `scripts/manage-users.ts`.

## 6. Visit your app

Vercel shows your live URL on the project dashboard (something like
`canopy-country-growth-os.vercel.app`, or your own domain if you add one under
**Settings → Domains**). Open it, sign in with the email/password from step 5.

## 7. (Optional) Load sample data

The app currently has empty tables aside from your one staff account. To load the same
SAMPLE DATA shown in the earlier screenshots, run `npm run db:seed` from your local
checkout (same `.env` setup as above). This is optional and only useful for demoing —
skip it once you're importing real leads via CSV.

---

## Ongoing: making code changes after this initial deploy

Every push to whichever branch Vercel is watching triggers a new build automatically —
you don't need to repeat these steps. Only re-run `npm run db:push` locally if a future
change modifies `prisma/schema.prisma`.

## Troubleshooting

- **Build fails with a Prisma/query-engine error:** almost always means `DATABASE_URL` or
  `DIRECT_URL` is missing or misnamed in Vercel's environment variables — recheck step 2.
- **Login page loads but sign-in always fails:** the database exists but has no `users`
  table yet, or no account exists — rerun step 4's `db:push` and step 5's `user:create`.
- **"UntrustedHost" or similar Auth.js error:** shouldn't happen (the app sets
  `trustHost: true` for exactly this reason), but if it does, double check `AUTH_SECRET`
  is set in the Production environment specifically, not only Preview/Development.
