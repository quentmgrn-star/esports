import { mutation, query, type MutationCtx } from "./_generated/server";
import { canSee, getAccess, requireAccess, type Access } from "./roles";

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

const sees = (a: Access, n: { team: string; dept?: string; captains?: boolean; byEmail: string }) =>
  n.byEmail !== a.email && canSee(a, { team: n.team, dept: n.dept, captains: !!n.captains });

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

