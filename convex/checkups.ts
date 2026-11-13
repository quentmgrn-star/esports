import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { DEPARTMENTS, canEdit, canSee, getAccess, requireAccess, type Access } from "./roles";
import { TEAMS } from "./teamList";

// Check-up notes ("all OK" or "issues"), one per person and scope each time they meet:
// weekly for associates (their department and team), monthly for heads (their department) and the Board,
// semester for every member. A note is visible to whoever sees its department / team (convex/roles.ts);
// a Board-wide note (no department, no team) to the Board and the Student Council.
const period = v.union(v.literal("weekly"), v.literal("monthly"), v.literal("semester"));
const sees = (a: Access, c: { dept?: string; team?: string }) =>
  c.dept || c.team ? canSee(a, { dept: c.dept, team: c.team, captains: !!c.team }) : a.board || a.full;

export const list = query({
  args: { period, key: v.string() },
  handler: async (ctx, { period, key }) => {
    const a = await getAccess(ctx);
    if (!a) return [];
    const rows = await ctx.db
      .query("checkups")
      .withIndex("by_period_key", (q) => q.eq("period", period).eq("key", key))
      .collect();
    return rows.filter((r) => sees(a, r)).sort((x, y) => y.at - x.at);
  },
});

export const save = mutation({
  args: {
    period,
    key: v.string(),
    dept: v.optional(v.string()),
    team: v.optional(v.string()),
    status: v.union(v.literal("ok"), v.literal("issues")),
    note: v.string(),
  },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    if (x.dept && !DEPARTMENTS.includes(x.dept)) throw new ConvexError("Unknown department.");
    if (x.team && !TEAMS.some((t) => t.id === x.team)) throw new ConvexError("Unknown team.");
    const ok = x.dept || x.team
      ? canEdit(a, { dept: x.dept, team: x.team, captains: !!x.team })
      : !a.readOnly && a.board;
    if (!ok) throw new ConvexError(a.readOnly ? "Your access is view-only." : "Not authorised for this check-up.");
    const note = x.note.trim().slice(0, 1000);
    if (x.status === "issues" && !note) throw new ConvexError("Describe the issue.");
    await ctx.db.insert("checkups", {
      period: x.period,
      key: x.key.slice(0, 20),
      dept: x.dept,
      team: x.team,
      status: x.status,
      note,
      by: `${a.name || a.email.split("@")[0]} (${a.label})`,
      byEmail: a.email,
      at: Date.now(),
    });
    return null;
  },
});
