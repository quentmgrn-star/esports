import { v } from "convex/values";
import { query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();
    return Promise.all(
      teams.map(async (t) => ({ ...t, sport: (await ctx.db.get(t.sportId))?.name ?? "" })),
    );
  },
});

/** Everything a sport page needs: team, roster, schedule and league table for the current season. */
export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const team = await ctx.db.query("teams").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
    if (!team) return null;
    const season = await ctx.db.query("seasons").filter((q) => q.eq(q.field("isCurrent"), true)).first();
    if (!season) return { team, season: null, players: [], matches: [], standings: null };
    const key = (q: any) => q.eq("teamId", team._id).eq("seasonId", season._id);
    const [players, matches, standings] = await Promise.all([
      ctx.db.query("players").withIndex("by_team_season", key).collect(),
      ctx.db.query("matches").withIndex("by_team_season", key).collect(),
      ctx.db.query("standings").withIndex("by_team_season", key).first(),
    ]);
    return { team, season, players, matches, standings };
  },
});
