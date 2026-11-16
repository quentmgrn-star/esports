import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { DEPARTMENTS, getAccess, isExecEditor, requireAccess, type Access } from "./roles";

// Board goals for the semester: a target and the real number next to it.
// Most real numbers are counted from the database ("source"); the rest (followers, attendance...) are typed in.
//   See: President, VPs, heads, admins, Student Council: all goals · associates: their department's goals.
//   Set targets: President, VPs, admins. Type the real number of a manual goal: also the head of its department.
export const SOURCES: Record<string, string> = {
  manual: "Typed in by hand",
  tryouts: "Try-out sign-ups (website)",
  social: "\"Just for fun\" sign-ups (website)",
  coaches: "Coach applications (website)",
  applications: "Applications to join the association",
  results: "Matches played (final results in the Hub)",
  players: "Players on the team sheets (rosters)",
  partnersSigned: "Partners signed (Partnerships tracker)",
  sponsorIncome: "Value of signed partnerships, € (Partnerships tracker)",
  spent: "Money spent: paid expenses, € (ledger)",
  alumni: "Alumni profiles published",
  members: "Approved members (Board, associates, captains)",
};

// "2026-27 S1" = 1 Sep 2026 to 31 Jan 2027 · "2026-27 S2" = 1 Feb to 30 Jun 2027.
export function termWindow(term: string): { start: number; end: number } | null {
  const m = term.match(/^(\d{4})-\d{2} S([12])$/);
  if (!m) return null;
  const y = +m[1];
  return m[2] === "1" ? { start: Date.UTC(y, 8, 1), end: Date.UTC(y + 1, 1, 1) } : { start: Date.UTC(y + 1, 1, 1), end: Date.UTC(y + 1, 6, 1) };
}
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function counts(ctx: QueryCtx, term: string): Promise<Record<string, number>> {
  const w = termWindow(term) ?? { start: 0, end: Number.MAX_SAFE_INTEGER };
  const inW = (ms: number) => ms >= w.start && ms < w.end;
  const inD = (d: string) => d >= ymd(w.start) && d < ymd(w.end);
  const apps = (await ctx.db.query("teamApplications").collect()).filter((x) => inW(x._creationTime));
  const partners = await ctx.db.query("partners").withIndex("by_stage", (q) => q.eq("stage", "signed")).collect();
  const rosters = await ctx.db.query("rosters").collect();
  const expenses = await ctx.db.query("expenses").withIndex("by_status", (q) => q.eq("status", "paid")).collect();
  const members = await ctx.db.query("members").withIndex("by_status", (q) => q.eq("status", "approved")).collect();
  return {
    tryouts: apps.filter((x) => x.kind === "tryout").length,
    social: apps.filter((x) => x.kind === "tryout" && x.track === "social").length,
    coaches: apps.filter((x) => x.kind === "coach").length,
    applications: (await ctx.db.query("associationApplications").collect()).filter((x) => inW(x._creationTime)).length,
    results: (await ctx.db.query("results").collect()).filter((r) => r.status === "Final" && inD(r.date)).length,
    players: rosters.reduce((n, r) => n + r.players.length, 0),
    partnersSigned: partners.length,
    sponsorIncome: partners.reduce((n, p) => n + (p.value ?? 0), 0),
    spent: expenses.filter((e) => !e.isExample && inD(e.date)).reduce((n, e) => n + e.amount, 0),
    alumni: (await ctx.db.query("alumniProfiles").withIndex("by_status", (q) => q.eq("status", "approved")).collect()).length,
    members: new Set(members.map((m) => m.email)).size,
  };
}

const seesGoal = (a: Access, dept?: string) => a.full || a.board || (!!dept && a.assoc.some((x) => x.department === dept));
const setsActual = (a: Access, dept?: string) => isExecEditor(a) || (!a.readOnly && !!dept && a.heads.includes(dept));

export const list = query({
  args: { term: v.string() },
  handler: async (ctx, { term }) => {
    const a = await getAccess(ctx);
    if (!a || (!a.full && !a.board && !a.assoc.length)) return null;
    const rows = (await ctx.db.query("goals").withIndex("by_term", (q) => q.eq("term", term)).collect()).filter((g) => seesGoal(a, g.dept));
    const c = await counts(ctx, term);
    return {
      goals: rows
        .sort((x, y) => x.at - y.at)
        .map((g) => ({ ...g, value: g.source === "manual" ? (g.actual ?? null) : (c[g.source] ?? null), canSetActual: g.source === "manual" && setsActual(a, g.dept) })),
      canEdit: isExecEditor(a),
      sources: SOURCES,
      terms: (await ctx.db.query("goalTerms").collect()).map((t) => t.term),
    };
  },
});

const fields = { term: v.string(), title: v.string(), dept: v.optional(v.string()), target: v.number(), unit: v.string(), source: v.string(), note: v.optional(v.string()) };
function clean(x: { term: string; title: string; dept?: string; target: number; unit: string; source: string; note?: string }) {
  if (!termWindow(x.term)) throw new ConvexError("Unknown semester.");
  const title = x.title.trim().slice(0, 120);
  if (!title) throw new ConvexError("Give the goal a name.");
  if (!Number.isFinite(x.target) || x.target < 0) throw new ConvexError("The target is a number.");
  if (!(x.source in SOURCES)) throw new ConvexError("Choose where the real number comes from.");
  const dept = x.dept && DEPARTMENTS.includes(x.dept) ? x.dept : undefined;
  return { term: x.term, title, dept, target: x.target, unit: x.unit.trim().slice(0, 20) || "#", source: x.source, note: x.note?.trim().slice(0, 300) || undefined };
}

export const add = mutation({
  args: fields,
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    if (!isExecEditor(a)) throw new ConvexError("Only the President, VPs and admins set goals.");
    await ctx.db.insert("goals", { ...clean(x), by: `${a.name || a.email.split("@")[0]} (${a.label})`, at: Date.now() });
    return null;
  },
});

export const update = mutation({
  args: { id: v.id("goals"), ...fields },
  handler: async (ctx, { id, ...x }) => {
    const a = await requireAccess(ctx);
    if (!isExecEditor(a)) throw new ConvexError("Only the President, VPs and admins change goals.");
    await ctx.db.patch(id, { ...clean(x), updatedAt: Date.now() });
    return null;
  },
});

export const setActual = mutation({
  args: { id: v.id("goals"), actual: v.number() },
  handler: async (ctx, { id, actual }) => {
    const a = await requireAccess(ctx);
    const g = await ctx.db.get(id);
    if (!g) throw new ConvexError("Goal not found.");
    if (g.source !== "manual") throw new ConvexError("This number is counted automatically.");
    if (!setsActual(a, g.dept)) throw new ConvexError("Only the head of the department or the President / VPs update this number.");
    if (!Number.isFinite(actual) || actual < 0) throw new ConvexError("Enter a number.");
    await ctx.db.patch(id, { actual, updatedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("goals") },
  handler: async (ctx, { id }) => {
    const a = await requireAccess(ctx);
    if (!isExecEditor(a)) throw new ConvexError("Only the President, VPs and admins remove goals.");
    await ctx.db.delete(id);
    return null;
  },
});

// "+" in the semester selector: adds the next semester so it stays in the list for everyone.
export const addTerm = mutation({
  args: { term: v.string() },
  handler: async (ctx, { term }) => {
    const a = await requireAccess(ctx);
    if (!isExecEditor(a)) throw new ConvexError("Only the President, VPs and admins add semesters.");
    if (!termWindow(term)) throw new ConvexError("Unknown semester.");
    const have = await ctx.db.query("goalTerms").withIndex("by_term", (q) => q.eq("term", term)).first();
    if (!have) await ctx.db.insert("goalTerms", { term, by: `${a.name || a.email.split("@")[0]} (${a.label})`, at: Date.now() });
    return null;
  },
});
