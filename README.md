# Esade Sports

Website of Esade Sports, the student sports association of Esade: portal, one page per team (roster, staff, schedule, stats), fixtures, Alumni corner, try-outs / join as coach, partnerships, EN / CA / ES.

Stack: **Next.js** (App Router, TypeScript) · **Convex** (database + backend functions) · hosted on **Vercel**.

## Run locally

```bash
npm install
npx convex dev        # logs in, creates a dev deployment, writes .env.local, keeps functions in sync
npm run seed          # once, in a second terminal: loads the teams, matches and example alumni
npm run dev           # http://localhost:3000
```

## Deploy on Vercel

1. Import this repo in Vercel (framework preset: Next.js).
2. In the Convex dashboard, create a **production deploy key** (Settings → Deploy keys).
3. In Vercel → Settings → Environment Variables, add `CONVEX_DEPLOY_KEY` (the key from step 2).
4. Set the Vercel **Build Command** to:
   ```
   npx convex deploy --cmd 'npm run build'
   ```
   This pushes the Convex functions and sets `NEXT_PUBLIC_CONVEX_URL` for the build automatically.
5. Seed production once: `npx convex run seed:run --prod`.

Without Convex configured the site still builds and renders; form submissions are then not stored.

## Project layout

```
app/                   layout (fonts, Convex provider), page, global styles
components/
  EsadeSite.tsx        mounts the site and wires forms to Convex
  legacy/              markup, page logic and translations ported from the original HTML prototype
lib/images.ts          Unsplash placeholder photos (swap for Esade Sports photos)
convex/
  schema.ts            seasons, sports, teams, players, matches, standings, alumni, applications, partner inquiries
  teams.ts, alumni.ts  queries
  forms.ts             try-out / coach applications, partner inquiries
  seed.ts, seedData.ts seed data
```

## Data

Real data (from the league sites, 12/11/2026): Football 7 Men (UniBall) and Basketball Men (css.cat). Everything else (other teams' rosters and schedules, alumni profiles) is **example data** and is flagged `isExample` / `dataStatus: "example"` in Convex. Do not present it as real.

`convex/_generated/` was created without a live deployment, so its `api` is untyped until you run `npx convex dev` once; commit the regenerated files.
