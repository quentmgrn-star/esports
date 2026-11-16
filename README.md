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
| President / Vice-president | Board, added by an admin (or by the President/a VP) | Everything | Everything | Everyone except the President (only an admin adds, changes or removes the President): /admin > People & requests |
| Head of department | Board, added by an admin, President or VP | Their department, for every team (e.g. Finance: all budgets and expenses) | Their department's data | Adds only associates of their own department; approves their associates' and captains' requests |
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
| Main links (`convex/deptLinks.ts`) | The department (head + associates), President, VPs, admins, Student Council | Added or removed by the department's head, President, VPs, admins. IT shows the GitHub, Vercel and Convex links; Operations also shows each team's league page from Team editor |
| Esade acceptance on expenses (`convex/expenses.ts` `esadeStep`) | Same as the ledger | Finance for the team forwards the request (with the unpaid invoice) to Esade's finance office and records sent / accepted / refused. **Finance cannot validate until Esade has accepted** (checked in Convex). Every step is kept in the history |
| Team roster (`convex/rosters.ts`): names, shirt size, number, DNI/NIE, nationality, birth date, email, phone, program, year, allergies | **Personal data.** The team's captain(s), the President, VPs and admins only. Not heads, associates, the Student Council view or the public site | The same people |
| Tournament (`convex/tournament.ts`): next Unijess tournament, each roster player's answer (Attending / Not attending / Not answered), ID / passport number, documents (PDF or image, max 10 MB, 8 per player) | **Personal data.** The team's captain(s) see their own team; admins, the President, VPs, heads and the view-only account (Eva Morta) see every team | The team's captain(s), the President, VPs and admins. Tournament name, date, place and answer deadline: admins, President, VPs |

Every decision is stored with who, when and why. The ledger and check-ups download as Excel (.xlsx: Summary, Ledger, Decision history, Check-ups) and PowerPoint (.pptx, Esade Sports layout), built in the browser from exactly what the person may see, so they are always up to date. An admin can load or remove example expenses (marked "Example") for a demo.

Admins: set or change the list with `npx convex env set ADMIN_EMAILS "a@alumni.esade.edu,b@alumni.esade.edu,c@alumni.esade.edu" --prod` (comma-separated). Removing an email removes admin rights at once.

The Hub (`/#hub-overview`) shows each person only the views their role allows; admins can preview any role from the Members page. Everything in the Hub is shared data in Convex:

| | Who sees it | Who acts |
|---|---|---|
| Tasks (`convex/tasks.ts`) | The department (associates: department-wide tasks + their teams), Board tasks for the Board, President, VPs, admins, Student Council | Add / remove: the head, President, VPs, admins. Status: anyone in the department |
| Team budgets (`convex/budgets.ts`) | Finance, Operations, Marketing for the team, its captains, President, VPs, admins, Student Council | Finance for the team (total, Operations / Marketing split, draft / in review / agreed) |
| Results (`convex/results.ts`) | Public (team pages) | The team's captains, Operations and Marketing for the team |
| Partnerships tracker (`convex/partners.ts`) | Partnerships (associates: association-wide partners + their teams), President, VPs, admins, Student Council; website partner inquiries too | Partnerships. Remove: the head, President, VPs, admins |
| Goals (`convex/goals.ts`) | President, VPs, heads, admins, Student Council; associates see their department's goals | Targets: President, VPs, admins. Typed-in numbers: also the department's head. Other numbers are counted from the database |
| Waiting for you (`convex/inbox.ts`) | Each person: requests, applications, try-outs and partner inquiries they can act on | Links to /admin or the Hub page |

People names in the Hub come from approved members (`org.overview`); nobody approved = "To be assigned". Made-up public content (fictional squads, example games, events and alumni) is hidden by `SHOW_EXAMPLES = false` at the top of `components/legacy/site.js`.

Confirmation emails (`convex/mail.ts`) go out after every public form (try-outs, just for fun, coaching, association applications, alumni profiles, access requests, contact, partner) in the visitor's language, once `RESEND_API_KEY` and `MAIL_FROM` are set on Convex. Without them, forms work and no email is sent.

Forgotten passwords (`convex/passwords.ts`):
- **Forgot password?** on the `/admin` sign-in page emails a link (EN/CA/ES, valid 1 hour, works once) to choose a new password. Same answer whether or not the account exists; at most 3 emails per address per hour. A link that did not go out shows in the "Email not sent" warning.
- **Temporary password**: in `/admin` > Organisation, admins, the President and the VPs can set one for a member (only an admin can do it for an admin, the President or a VP). It is shown once to pass on in person, never emailed or stored; the member is signed out everywhere and asked to choose their own password when they sign in. The Organisation tab lists the last 20 resets (who, when).

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
