import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canEdit, getAccess, requireAccess, type Access } from "./roles";
import { TEAMS } from "./teamList";

// Match results typed in the Hub (Team editor). Public: they show on the team page straight away.
// Added or removed by the team's captains, Operations and Media & Marketing for the team, President, VPs, admins.
const edits = (a: Access, team: string) =>
  canEdit(a, { team, captains: true }) || canEdit(a, { dept: "Operations", team }) || canEdit(a, { dept: "Media & Marketing", team });

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("results").collect();
    return rows
      .map((r) => ({ _id: r._id, team: r.team, date: r.date, opponent: r.opponent, side: r.side, score: r.score, status: r.status, competition: r.competition }))
      .sort((x, y) => (x.date < y.date ? -1 : 1));
  },
});

// Same list for the Hub, with what the signed-in person may remove.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    const rows = await ctx.db.query("results").collect();
    return rows.map((r) => ({ ...r, canRemove: !!a && edits(a, r.team) })).sort((x, y) => (x.date < y.date ? -1 : 1));
  },
});

export const add = mutation({
  args: {
    team: v.string(),
    date: v.string(),
    opponent: v.string(),
    side: v.union(v.literal("Home"), v.literal("Away")),
    score: v.optional(v.string()),
    status: v.union(v.literal("Final"), v.literal("Pending"), v.literal("Postponed")),
    competition: v.optional(v.string()),
  },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    if (!TEAMS.some((t) => t.id === x.team)) throw new ConvexError("Unknown team.");
    if (!edits(a, x.team)) throw new ConvexError("Only the captain, Operations or Marketing for this team adds results.");
    const opponent = x.opponent.trim().slice(0, 100);
    const score = x.score?.trim().slice(0, 40) || undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date)) throw new ConvexError("Choose the date.");
    if (!opponent) throw new ConvexError("Enter the opponent.");
    if (x.status === "Final" && !score) throw new ConvexError("Add the score for a final result.");
    await ctx.db.insert("results", {
      team: x.team,
      date: x.date,
      opponent,
      side: x.side,
      score,
      status: x.status,
      competition: x.competition?.trim().slice(0, 120) || undefined,
      by: `${a.name || a.email.split("@")[0]} (${a.label})`,
      byEmail: a.email,
      at: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("results") },
  handler: async (ctx, { id }) => {
    const a = await requireAccess(ctx);
    const r = await ctx.db.get(id);
    if (!r) return null;
    if (!edits(a, r.team)) throw new ConvexError("You can't remove this result.");
    await ctx.db.delete(id);
    return null;
  },
});
