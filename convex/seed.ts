import { internalMutation } from "./_generated/server";
import { ALUMNI, MATCHES, PLAYERS, SEASON, SPORTS, STANDINGS, TEAMS } from "./seedData";

/** Fills an empty deployment with the prototype data. Run once: `npx convex run seed:run`. */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (await ctx.db.query("teams").first()) return "Already seeded, nothing to do.";

    const seasonId = await ctx.db.insert("seasons", SEASON);
    const sportIds: Record<string, any> = {};
    for (const s of SPORTS) sportIds[s.slug] = await ctx.db.insert("sports", s);

    const teamIds: Record<string, any> = {};
    for (const { sport, squad, dataStatus, ...t } of TEAMS) {
      teamIds[t.slug] = await ctx.db.insert("teams", {
        ...t,
        sportId: sportIds[sport],
        squad: squad as "Men" | "Women" | "Mixed",
        dataStatus: dataStatus as "real" | "example",
      });
    }
    for (const { team, ...p } of PLAYERS) await ctx.db.insert("players", { ...p, teamId: teamIds[team], seasonId });
    for (const { team, ...m } of MATCHES) await ctx.db.insert("matches", { ...m, teamId: teamIds[team], seasonId });
    for (const { team, ...s } of STANDINGS) await ctx.db.insert("standings", { ...s, teamId: teamIds[team], seasonId });
    for (const a of ALUMNI) await ctx.db.insert("alumni", a);

    return `Seeded ${TEAMS.length} teams, ${PLAYERS.length} players, ${MATCHES.length} matches, ${ALUMNI.length} example alumni.`;
  },
});
