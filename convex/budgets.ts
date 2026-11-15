import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canEdit, canSee, getAccess, requireAccess, type Access } from "./roles";
import { logActivity } from "./activity";
import { TEAMS } from "./teamList";

// Each team's season budget, set by Finance and agreed with the captain. Only Operations and Marketing spend it.
//   See: Finance, Operations and Media & Marketing for the team, the team's captains, President, VPs, admins, Student Council.
//   Set: Finance for the team (head: every team; associates: their teams), President, VPs, admins.
const SPENDERS = ["Finance", "Operations", "Media & Marketing"];
const sees = (a: Access, team: string) => canSee(a, { team, captains: true }) || SPENDERS.some((dept) => canSee(a, { dept, team }));

export const list = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return [];
    const rows = await ctx.db.query("teamBudgets").collect();
    return rows.filter((b) => sees(a, b.team)).map((b) => ({ ...b, canEdit: canEdit(a, { dept: "Finance", team: b.team }) }));
  },
});

export const set = mutation({
  args: {
    team: v.string(),
    total: v.number(),
    opsShare: v.number(),
    status: v.union(v.literal("draft"), v.literal("review"), v.literal("agreed")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    if (!TEAMS.some((t) => t.id === x.team)) throw new ConvexError("Unknown team.");
    if (!canEdit(a, { dept: "Finance", team: x.team })) throw new ConvexError("Only Finance sets team budgets.");
    if (!Number.isFinite(x.total) || x.total < 0 || x.total > 1_000_000) throw new ConvexError("Enter a budget in euros.");
    if (!Number.isFinite(x.opsShare) || x.opsShare < 0 || x.opsShare > 100) throw new ConvexError("The Operations share is a % between 0 and 100.");
    const row = {
      team: x.team,
      total: Math.round(x.total),
      opsShare: Math.round(x.opsShare),
      status: x.status,
      note: x.note?.trim().slice(0, 300) || undefined,
      by: `${a.name || a.email.split("@")[0]} (${a.label})`,
      at: Date.now(),
    };
    const old = await ctx.db.query("teamBudgets").withIndex("by_team", (q) => q.eq("team", x.team)).unique();
    if (old) await ctx.db.patch(old._id, row);
    else await ctx.db.insert("teamBudgets", row);
    await logActivity(ctx, a, x.team, "budget", `Budget set to €${row.total} (${row.opsShare}% Operations, ${row.status})`);
    return null;
  },
});
