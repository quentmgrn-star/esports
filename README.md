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

Departments: Finance, Media & Marketing, Operations, Partnerships, IT (`DEPARTMENTS` in `convex/roles.ts`). Department of each kind of data: try-outs, coach sign-ups and captains' ideas to **Operations**; team pages to **Media & Marketing**; partnership messages to **Partnerships**; each expense to its budget line (**Operations** or **Marketing**), and **Finance** sees and decides every expense. Association applications are seen by the heads of the departments the applicant chose. Alumni profiles (with email and phone) and the captains list are for full access only.

### Expenses ledger, check-ups, ideas (Hub)

| | Who sees it | Who acts |
|---|---|---|
| Expenses ledger (`convex/expenses.ts`) | Captains: their team · associates: their department for their teams · heads: their department for every team · Finance: every expense of its teams · President, VPs, admins, Student Council: all | Request: captains, Finance, Operations, Marketing for their teams. Validate / reject (a written reason is required): Finance for the team. Mark paid: Head of Finance, President, VPs, admins. Reconsider (back to "requested", reason kept in the history): whoever decided it, or the Head of Finance, President, VPs, admins |
| Check-ups (`convex/checkups.ts`) | Notes follow the same department / team rules; Board notes are for the Board and the Student Council | Weekly: associates · monthly: heads and the Board · semester: every member |
| Ideas & logistics (`convex/ideas.ts`) | The team's captains, Operations, Finance and Marketing for the team, President, VPs, admins, Student Council | Captain suggests (Operations notified) or Operations proposes. Operations sends it to the captain with a comment: "budget" also creates an expense request for Finance, "team only" goes to the captain alone. Captain approves (Marketing notified) or declines (Operations notified). Marketing marks it communicated on the media accounts or as platform news (captain notified). Anyone involved can comment |
| Notifications (`convex/notifications.ts`) | Addressed to a team's captains and/or a department for a team; seen by whoever sees that (roles.ts) | Shown on the Hub overview with a "new" count |
| Task updates (`convex/taskUpdates.ts`) | Everyone in the task's department (head + associates), President, VPs, admins, Student Council (read-only) | Work summaries and comments with a link, image or PDF, posted by the department's own members (and President, VPs, admins) |
| Team roster (`convex/rosters.ts`): names, shirt size, number, DNI/NIE, nationality, birth date, email, phone, program, year, allergies | **Personal data.** The team's captain(s), the President, VPs and admins only. Not heads, associates, the Student Council view or the public site | The same people |

Every decision is stored with who, when and why. The ledger and check-ups download as Excel (.xlsx: Summary, Ledger, Decision history, Check-ups) and PowerPoint (.pptx, Esade Sports layout), built in the browser from exactly what the person may see, so they are always up to date. An admin can load or remove example expenses (marked "Example") for a demo.

Admins: set or change the list with `npx convex env set ADMIN_EMAILS "a@alumni.esade.edu,b@alumni.esade.edu,c@alumni.esade.edu" --prod` (comma-separated). Removing an email removes admin rights at once.

The Hub (`/#hub-overview`) shows each person only the views their role allows; admins can preview any role from the Members page. Expenses, check-ups and ideas are real data in Convex; budgets, tasks and people names are still example data (marked Prototype).

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

## Design skill

`.claude/skills/impeccable/` is the [Impeccable](https://github.com/pbakaus/impeccable) design skill (Apache 2.0, upstream commit in `UPSTREAM_COMMIT`), so Claude Code sessions in this repo follow its design rules (no eyebrow labels above headings, no emoji/glyph icons, themed browser surfaces, etc.). Its optional helper binary (`scripts/impeccable`) downloads an engine on first run; it is not needed for the design rules. Keep the Esade identity: Esade Navy / Esade Blue, Be Vietnam Pro, italic uppercase titles, slanted plates.
