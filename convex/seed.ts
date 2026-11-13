import { internalMutation } from "./_generated/server";
import { ALUMNI, MATCHES, PLAYERS, SEASON, SPORTS, STANDINGS, TEAMS } from "./seedData";

type Squad = "Men" | "Women" | "Mixed" | "Open";

/**
 * Fills the database with the prototype data. Safe to run again:
 * - empty database: inserts everything (season, sports, teams, players, matches, standings, alumni);
 * - already seeded: only adds the sports and teams that are missing (e.g. Rugby and Tennis), nothing else changes.
 * Run it from the Convex dashboard (Functions > seed:run > Run) or with `npx convex run seed:run --prod`.
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const alreadySeeded = !!(await ctx.db.query("teams").first());

    const sportIds: Record<string, any> = {};
    let newSports = 0;
    for (const s of SPORTS) {
      const existing = await ctx.db.query("sports").withIndex("by_slug", (q) => q.eq("slug", s.slug)).unique();
      if (existing) sportIds[s.slug] = existing._id;
      else {
        sportIds[s.slug] = await ctx.db.insert("sports", s);
        newSports++;
      }
    }

    const teamIds: Record<string, any> = {};
    const added: string[] = [];
    for (const { sport, squad, dataStatus, ...t } of TEAMS) {
      const existing = await ctx.db.query("teams").withIndex("by_slug", (q) => q.eq("slug", t.slug)).unique();
      if (existing) {
        teamIds[t.slug] = existing._id;
        continue;
      }
      teamIds[t.slug] = await ctx.db.insert("teams", {
        ...t,
        sportId: sportIds[sport],
        squad: squad as Squad,
        dataStatus: dataStatus as "real" | "example",
      });
      added.push(t.slug);
    }

    if (alreadySeeded) {
      return added.length
        ? `Already seeded. Added ${newSports} sport(s) and the missing team(s): ${added.join(", ")}.`
        : "Already seeded and up to date, nothing to do.";
    }

    const seasonId = await ctx.db.insert("seasons", SEASON);
    for (const { team, ...p } of PLAYERS) await ctx.db.insert("players", { ...p, teamId: teamIds[team], seasonId });
    for (const { team, ...m } of MATCHES) await ctx.db.insert("matches", { ...m, teamId: teamIds[team], seasonId });
    for (const { team, ...s } of STANDINGS) await ctx.db.insert("standings", { ...s, teamId: teamIds[team], seasonId });
    for (const a of ALUMNI) await ctx.db.insert("alumni", a);

    return `Seeded ${TEAMS.length} teams, ${PLAYERS.length} players, ${MATCHES.length} matches, ${ALUMNI.length} example alumni.`;
  },
});
