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

## Admin area (`/admin`)

`/admin` lists everyone who applied through **Apply to the association**, with filters (first name, programme, year, department) and a detail view (CV and video included). Sign-in uses [Better Auth](https://better-auth.com) through the Convex component `@convex-dev/better-auth`.

Only emails listed in the `ADMIN_EMAILS` Convex environment variable can create an account and read applications (checked on the server, in Convex). Set these once per deployment (add `--prod` for production):

```bash
npx convex env set ADMIN_EMAILS "first@alumni.esade.edu,second@alumni.esade.edu"   # comma-separated
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
npx convex env set SITE_URL https://your-site.vercel.app      # http://localhost:3000 for the dev deployment
```

Then open `/admin`, choose **Create one**, and sign up with an approved email. To give someone access, add their email to `ADMIN_EMAILS`; removing it takes access away immediately.

## Roles and permissions

All rules live in one place, `convex/roles.ts` (`getAccess`, `canSee`, `canEdit`), and every Convex query and mutation goes through it. The website and `/admin` only hide what the server would refuse anyway.

| Role | Who | Sees | Can change | Approves |
|---|---|---|---|---|
| Visitor | Any student, no account | Public site only | Sends try-outs, applications, contact messages, alumni profiles, access requests | — |
| Admin | Emails in `ADMIN_EMAILS` (the builders, for now) | Everything | Everything | Everyone, incl. Board positions and view-only accounts |
| President / Vice-president | Board, added by an admin | Everything | Everything | Associates and captains |
| Head of department | Board, added by an admin | Their department, for every team (e.g. Finance: all budgets and expenses) | Their department's data | Their department's associates, captain requests |
| Associate | Requests access, approved by their head | Their department, only for their assigned teams | That data | — |
| Captain | Requests access, approved by the Board | Their own team(s): messages about their sport, try-outs, team expenses | Their team's data | — |
| View only | Student Council, Eva Morta (added by an admin, not open yet) | Everything | Nothing | — |

Department of each kind of data: expenses, budgets and the semester report belong to **Finance**; try-outs and coach sign-ups to **Operations**; team pages to **Media & Marketing**; partnership messages to **Partnerships**. Association applications are seen by the heads of the departments the applicant chose. Alumni profiles (with email and phone) and the captains list are for full access only. Departments list: `DEPARTMENTS` in `convex/roles.ts`.

Admins: set or change the list with `npx convex env set ADMIN_EMAILS "a@alumni.esade.edu,b@alumni.esade.edu,c@alumni.esade.edu" --prod` (comma-separated). Removing an email removes admin rights at once.

The Hub (`/#hub-overview`) shows each person only the views their role allows; admins can preview any role from the Members page. Its figures are still example data (marked Prototype).

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
app/                   layout (fonts, Convex provider), page, global styles, admin/, api/auth/
components/
  EsadeSite.tsx        mounts the site and wires forms to Convex
  admin/AdminApp.tsx   /admin: sign-in, applications list, filters, detail modal
  legacy/              markup, page logic and translations ported from the original HTML prototype
lib/images.ts          Unsplash placeholder photos (swap for Esade Sports photos)
convex/
  schema.ts            seasons, sports, teams, players, matches, standings, alumni, applications, partner inquiries
  teams.ts, alumni.ts  queries
  forms.ts             try-out / coach / association applications, partner inquiries
  auth.ts, http.ts     Better Auth (admin accounts, ADMIN_EMAILS)
  admin.ts             admin-only queries
  seed.ts, seedData.ts seed data
```

## Data

Real data (from the league sites, 12/11/2026): Football 7 Men (UniBall) and Basketball Men (css.cat). Everything else (other teams' rosters and schedules, alumni profiles) is **example data** and is flagged `isExample` / `dataStatus: "example"` in Convex. Do not present it as real.

`convex/_generated/` was created without a live deployment, so its `api` is untyped until you run `npx convex dev` once; commit the regenerated files.
