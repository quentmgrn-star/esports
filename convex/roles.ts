import { ConvexError } from "convex/values";
import { internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { authComponent, isAdminEmail } from "./auth";
import { sportOfTeam } from "./teamList";

export type Access = { email: string; name: string; isAdmin: boolean; teams: string[] };

export async function captainTeams(ctx: QueryCtx | MutationCtx, email: string): Promise<string[]> {
  const row = await ctx.db
    .query("captains")
    .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
    .unique();
  return row?.teams ?? [];
}

// Who is signed in and what they may see. null when signed out or neither admin nor captain.
export async function getAccess(ctx: QueryCtx | MutationCtx): Promise<Access | null> {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) return null;
  const isAdmin = isAdminEmail(user.email);
  const teams = isAdmin ? [] : await captainTeams(ctx, user.email);
  if (!isAdmin && teams.length === 0) return null;
  return { email: user.email, name: user.name, isAdmin, teams };
}

export async function requireAccess(ctx: QueryCtx | MutationCtx): Promise<Access> {
  const a = await getAccess(ctx);
  if (!a) throw new ConvexError("Not authorised.");
  return a;
}

// Sports a captain covers (contact messages are routed by sport).
export const sportsOf = (teams: string[]) => new Set(teams.map(sportOfTeam).filter(Boolean) as string[]);

// Used by the sign-up hook (runs in an HTTP action, without direct db access).
export const isCaptainEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => (await captainTeams(ctx, email)).length > 0,
});
