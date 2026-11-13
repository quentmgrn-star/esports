import { ConvexError } from "convex/values";
import { internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { authComponent, isAdminEmail } from "./auth";
import { sportOfTeam } from "./teamList";

// Departments of the association. Change this list to add or rename a department.
export const DEPARTMENTS = ["Finance", "Media & Marketing", "Operations", "Partnerships"];

export type Access = {
  email: string;
  name: string;
  isAdmin: boolean;
  teams: string[]; // teams they captain
  board: string[]; // departments they head
  associate: string[]; // departments they are an associate of
  seesAll: boolean; // admin or Board: every message and try-out sign-up
  label: string; // badge: "Admin", "Board · Finance", "Associate · Operations", "Captain · Football 7"
};

export async function captainTeams(ctx: QueryCtx | MutationCtx, email: string): Promise<string[]> {
  const row = await ctx.db
    .query("captains")
    .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
    .unique();
  return row?.teams ?? [];
}

async function approvedRoles(ctx: QueryCtx | MutationCtx, email: string) {
  const rows = await ctx.db
    .query("members")
    .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
    .collect();
  const ok = rows.filter((r) => r.status === "approved");
  return {
    board: ok.filter((r) => r.role === "board" && r.department).map((r) => r.department!),
    associate: ok.filter((r) => r.role === "associate" && r.department).map((r) => r.department!),
  };
}

// Who is signed in and what they may see. null when signed out or without any approved role.
export async function getAccess(ctx: QueryCtx | MutationCtx): Promise<Access | null> {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) return null;
  const isAdmin = isAdminEmail(user.email);
  const teams = await captainTeams(ctx, user.email);
  const { board, associate } = await approvedRoles(ctx, user.email);
  if (!isAdmin && !teams.length && !board.length && !associate.length) return null;
  const sports = [...sportsOf(teams)];
  const label = isAdmin
    ? "Admin"
    : board.length
      ? `Board · ${board.join(", ")}`
      : associate.length
        ? `Associate · ${associate.join(", ")}`
        : `Captain · ${sports.join(", ")}`;
  return { email: user.email.toLowerCase(), name: user.name, isAdmin, teams, board, associate, seesAll: isAdmin || board.length > 0, label };
}

export async function requireAccess(ctx: QueryCtx | MutationCtx): Promise<Access> {
  const a = await getAccess(ctx);
  if (!a) throw new ConvexError("Not authorised.");
  return a;
}

// Sports a captain covers (contact messages are routed by sport).
export function sportsOf(teams: string[]): Set<string> {
  return new Set(teams.map(sportOfTeam).filter(Boolean) as string[]);
}

// Used by the sign-up hook (runs in an HTTP action, without direct db access):
// a captain or an approved Board member / associate may create an account.
export const isCaptainEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<boolean> => {
    if ((await captainTeams(ctx, email)).length > 0) return true;
    const r = await approvedRoles(ctx, email);
    return r.board.length > 0 || r.associate.length > 0;
  },
});
