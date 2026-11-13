import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canSee, getAccess, requireEdit, type Resource } from "./roles";
import { TEAMS } from "./teamList";

// Team pages belong to the team's captains and to Media & Marketing (rules: convex/roles.ts).
const res = (teamId: string): Resource => ({ team: teamId, captains: true, dept: "Media & Marketing" });
const PUBLIC = ["about", "league", "leagueUrl", "venue", "venueAddress", "contact"] as const;

// For the public team pages: never includes the facility or league contact people.
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("teamInfo").collect();
    return rows.map((r) => {
      const out: Record<string, string | undefined> = { teamId: r.teamId };
      for (const k of PUBLIC) out[k] = r[k];
      return out;
    });
  },
});

// Everything, for signed-in members who see this team (Team editor).
export const get = query({
  args: { teamId: v.string() },
  handler: async (ctx, { teamId }) => {
    const a = await getAccess(ctx);
    if (!a || !canSee(a, res(teamId))) return null;
    return await ctx.db.query("teamInfo").withIndex("by_team", (q) => q.eq("teamId", teamId)).unique();
  },
});

const field = v.optional(v.string());
export const save = mutation({
  args: {
    teamId: v.string(),
    about: field,
    league: field,
    leagueUrl: field,
    leagueContactName: field,
    leagueContactEmail: field,
    leagueContactPhone: field,
    venue: field,
    venueAddress: field,
    venueContactName: field,
    venueContactEmail: field,
    venueContactPhone: field,
    contact: field,
  },
  handler: async (ctx, args) => {
    if (!TEAMS.some((t) => t.id === args.teamId)) throw new ConvexError("Unknown team.");
    const a = await requireEdit(ctx, res(args.teamId));
    const clip = (s: string | undefined, n: number) => s?.trim().slice(0, n) || undefined;
    const url = clip(args.leagueUrl, 300);
    if (url && !/^https?:\/\//i.test(url)) throw new ConvexError("The league page link must start with https://");
    const row = {
      teamId: args.teamId,
      about: clip(args.about, 600),
      league: clip(args.league, 120),
      leagueUrl: url,
      leagueContactName: clip(args.leagueContactName, 100),
      leagueContactEmail: clip(args.leagueContactEmail, 200),
      leagueContactPhone: clip(args.leagueContactPhone, 30),
      venue: clip(args.venue, 120),
      venueAddress: clip(args.venueAddress, 200),
      venueContactName: clip(args.venueContactName, 100),
      venueContactEmail: clip(args.venueContactEmail, 200),
      venueContactPhone: clip(args.venueContactPhone, 30),
      contact: clip(args.contact, 200),
      updatedBy: a.email,
      updatedAt: Date.now(),
    };
    const existing = await ctx.db.query("teamInfo").withIndex("by_team", (q) => q.eq("teamId", args.teamId)).unique();
    if (existing) await ctx.db.replace(existing._id, row);
    else await ctx.db.insert("teamInfo", row);
  },
});
