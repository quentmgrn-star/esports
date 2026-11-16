import { mutation, query, type MutationCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { canSee, getAccess, requireAccess, type Access } from "./roles";
import { teamLabel } from "./teamList";

// In-app notifications. A notification is addressed to a team's captains and/or a department for a team,
// so whoever would see that (convex/roles.ts) sees it: e.g. { team, dept: "Finance" } reaches the Finance
// associate of the team and the Head of Finance; { team, captains: true } reaches the team's captain(s).
export type Notify = { team: string; dept?: string; captains?: boolean; title: string; body?: string; link?: string };

export async function notify(ctx: MutationCtx, a: Access, n: Notify) {
  await ctx.db.insert("notifications", {
    ...n,
    title: n.title.slice(0, 160),
    body: n.body?.slice(0, 400),
    by: `${a.name || a.email.split("@")[0]} (${a.label})`,
    byEmail: a.email,
    at: Date.now(),
  });
}

// "aud" tokens (notifications not about a team): "top" = admins, President, VPs; "head:X" = Head of X;
// "dept:X" = Head of X and X associates.
function inAudience(a: Access, aud: string[]) {
  return aud.some((t) => {
    if (t === "top") return a.isAdmin || a.exec;
    if (t.startsWith("head:")) return a.heads.includes(t.slice(5));
    if (t.startsWith("dept:")) return a.heads.includes(t.slice(5)) || a.assoc.some((x) => x.department === t.slice(5));
    return false;
  });
}
const sees = (a: Access, n: { team: string; dept?: string; captains?: boolean; aud?: string[]; byEmail: string }) =>
  n.byEmail !== a.email && (n.aud ? inAudience(a, n.aud) : canSee(a, { team: n.team, dept: n.dept, captains: !!n.captains }));

// Accounts created before this feature went live already signed in: they are recorded without a notification.
const FIRST_LOGIN_SINCE = Date.UTC(2026, 10, 16, 18, 45);

// Called by the site and /admin once someone is signed in. The first time a captain, head of department
// or associate signs in, it tells: captains and heads -> admins, President, VPs; associates -> the head of
// their department; IT (head + associates) -> everyone. Only name, role, team or department are shown.
export const recordFirstLogin = mutation({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return null;
    const done = await ctx.db.query("firstLogins").withIndex("by_email", (q) => q.eq("email", a.email)).unique();
    if (done) return null;
    const user = await authComponent.safeGetAuthUser(ctx);
    const isNew = !!user && (user.createdAt ?? 0) >= FIRST_LOGIN_SINCE;
    // Admins, President/VPs and the view-only account are not announced.
    const announce = isNew && !a.isAdmin && !a.exec && (a.heads.length > 0 || a.assoc.length > 0 || a.teams.length > 0);
    await ctx.db.insert("firstLogins", { email: a.email, at: Date.now(), notified: announce });
    if (!announce) return null;
    const roles: string[] = [];
    const aud = new Set<string>(["dept:IT"]);
    for (const d of a.heads) { roles.push(`Head of ${d}`); aud.add("top"); }
    for (const x of a.assoc) { roles.push(`Associate, ${x.department}`); aud.add(`head:${x.department}`); }
    if (a.teams.length) { roles.push(`Captain, ${a.teams.map(teamLabel).join(", ")}`); aud.add("top"); }
    const name = a.name || a.email.split("@")[0];
    await ctx.db.insert("notifications", {
      team: "",
      aud: [...aud],
      title: `${name} (${roles.join("; ")}) signed in for the first time`.slice(0, 160),
      link: "hub-overview",
      by: name,
      byEmail: a.email,
      at: Date.now(),
    });
    return null;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return { items: [], seenAt: 0 };
    const rows = await ctx.db.query("notifications").withIndex("by_at").order("desc").take(300);
    const seen = await ctx.db.query("notifSeen").withIndex("by_email", (q) => q.eq("email", a.email)).unique();
    return { items: rows.filter((n) => sees(a, n)).slice(0, 40), seenAt: seen?.at ?? 0 };
  },
});

export const markSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const a = await requireAccess(ctx);
    const row = await ctx.db.query("notifSeen").withIndex("by_email", (q) => q.eq("email", a.email)).unique();
    if (row) await ctx.db.patch(row._id, { at: Date.now() });
    else await ctx.db.insert("notifSeen", { email: a.email, at: Date.now() });
    return null;
  },
});

