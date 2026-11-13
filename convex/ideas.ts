import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canEdit, canSee, getAccess, requireAccess, type Access } from "./roles";
import { TEAMS } from "./teamList";

// Captains suggest (a friendly, a tournament, jerseys, travel, a training or league facility);
// Operations researches and organises it; Finance sees it to plan the budget.
// Seen by: the team's captains, Operations and Finance for the team (associates of the team, heads for all),
// president, VPs, admins, Student Council. Updated by Operations for the team, president, VPs, admins.
const OPS = "Operations";
const sees = (a: Access, team: string) =>
  canSee(a, { team, dept: OPS, captains: true }) || canSee(a, { team, dept: "Finance" });
const runs = (a: Access, team: string) => canEdit(a, { team, dept: OPS });
const who = (a: Access) => `${a.name || a.email.split("@")[0]} (${a.label})`;
export const KINDS = ["Friendly game", "Tournament", "Jerseys / kit", "Travel / logistics", "Training facility", "League facility", "Other"];

export const list = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return [];
    const rows = await ctx.db.query("ideas").collect();
    return rows.filter((r) => sees(a, r.team)).map((r) => ({ ...r, canUpdate: runs(a, r.team) })).sort((x, y) => y.at - x.at);
  },
});

export const suggest = mutation({
  args: { team: v.string(), kind: v.string(), text: v.string() },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    if (!TEAMS.some((t) => t.id === x.team)) throw new ConvexError("Unknown team.");
    if (!canEdit(a, { team: x.team, dept: OPS, captains: true })) throw new ConvexError(a.readOnly ? "Your access is view-only." : "Only the team's captains and Operations can add ideas.");
    const text = x.text.trim().slice(0, 600);
    if (!text) throw new ConvexError("Describe the idea.");
    await ctx.db.insert("ideas", {
      team: x.team,
      kind: KINDS.includes(x.kind) ? x.kind : "Other",
      text,
      status: "new",
      by: who(a),
      byEmail: a.email,
      at: Date.now(),
    });
    return null;
  },
});

export const update = mutation({
  args: {
    id: v.id("ideas"),
    status: v.union(v.literal("new"), v.literal("researching"), v.literal("planned"), v.literal("dropped")),
    opsNote: v.optional(v.string()),
    estimate: v.optional(v.number()),
  },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    const r = await ctx.db.get(x.id);
    if (!r) throw new ConvexError("This idea no longer exists.");
    if (!runs(a, r.team)) throw new ConvexError("Only Operations for this team can update it.");
    await ctx.db.patch(x.id, {
      status: x.status,
      opsNote: x.opsNote?.trim().slice(0, 1000) || undefined,
      estimate: x.estimate && x.estimate > 0 ? Math.round(x.estimate) : undefined,
      updatedBy: who(a),
      updatedAt: Date.now(),
    });
    return null;
  },
});
