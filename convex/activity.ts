import { v } from "convex/values";
import { query, type MutationCtx } from "./_generated/server";
import { getAccess, type Access } from "./roles";

// Team activity feed (Hub, captain pages): one short line per change made on a team, newest first.
// Who sees a team's feed: admins, President / VPs and the view-only account (every team); a captain only
// their own team(s). Keep lines free of personal data: no ID numbers, file names of ID documents, phones or emails.
export type Area = "expenses" | "ideas" | "roster" | "tournament" | "handover" | "results" | "team" | "budget" | "signups";

export async function logActivity(ctx: MutationCtx, a: Access, team: string, area: Area, what: string) {
  // Same person, same line, within a minute (e.g. the same file added twice): keep one entry.
  const last = await ctx.db.query("activity").withIndex("by_team_at", (q) => q.eq("team", team)).order("desc").first();
  if (last && last.byEmail === a.email && last.what === what.slice(0, 200) && Date.now() - last.at < 60_000) return;
  await ctx.db.insert("activity", {
    team,
    area,
    what: what.slice(0, 200),
    by: `${a.name || a.email.split("@")[0]} (${a.label})`,
    byEmail: a.email,
    at: Date.now(),
  });
}

const seesFeed = (a: Access, team: string) => a.full || a.teams.includes(team);

export const forTeam = query({
  args: { team: v.string() },
  handler: async (ctx, { team }) => {
    const a = await getAccess(ctx);
    if (!a || !seesFeed(a, team)) return [];
    const rows = await ctx.db
      .query("activity")
      .withIndex("by_team_at", (q) => q.eq("team", team))
      .order("desc")
      .take(60);
    return rows.map((r) => ({ id: r._id, area: r.area, what: r.what, by: r.by, at: r.at, mine: r.byEmail === a.email }));
  },
});
