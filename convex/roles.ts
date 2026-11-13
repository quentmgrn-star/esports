import { ConvexError } from "convex/values";
import { internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { authComponent, isAdminEmail } from "./auth";
import { sportOfTeam } from "./teamList";

// ONE place that decides who sees and edits what. Permissions table: README.md.
//   Admin (ADMIN_EMAILS env, comma-separated) .... everything, can edit everything
//   President / Vice-president (Board) ........... everything, can edit everything
//   Head of department (Board) ................... their department, for every team
//   Associate .................................... their department, only their assigned teams
//   Captain ...................................... their own team(s)
//   Viewer (Student Council, Eva Morta) .......... everything, read-only
export const DEPARTMENTS = ["Finance", "Media & Marketing", "Operations", "Partnerships", "IT"];

export type Access = {
  email: string;
  name: string;
  isAdmin: boolean;
  exec: boolean; // president or vice-president
  heads: string[]; // departments they head
  assoc: { department: string; teams: string[] }[];
  teams: string[]; // teams they captain
  viewer: boolean;
  full: boolean; // sees everything (admin, president, VP, viewer)
  readOnly: boolean; // may not change anything (viewer only)
  board: boolean; // admin, president, VP or head
  label: string; // badge: "Admin", "President", "Head of Finance", "Associate · Operations", "Captain · Football 7", "Student Council (view only)"
};

// What a piece of data belongs to. Anything without a department or team is for "full" access only.
export type Resource = { dept?: string; team?: string; sport?: string; captains?: boolean };

export function canSee(a: Access, r: Resource): boolean {
  if (a.full) return true;
  if (r.dept && a.heads.includes(r.dept)) return true;
  if (r.dept && a.assoc.some((x) => x.department === r.dept && teamMatch(x.teams, r))) return true;
  if (r.captains && (r.team || r.sport) && teamMatch(a.teams, r)) return true;
  return false;
}
export function canEdit(a: Access, r: Resource): boolean {
  return !a.readOnly && canSee(a, r);
}
function teamMatch(teams: string[], r: Resource) {
  if (r.team) return teams.includes(r.team);
  if (r.sport) return teams.some((t) => sportOfTeam(t) === r.sport);
  return true; // department-wide item (no team)
}
// Admin, president and vice-presidents: edit everything.
export const isExecEditor = (a: Access) => !a.readOnly && (a.isAdmin || a.exec);

export async function captainTeams(ctx: QueryCtx | MutationCtx, email: string): Promise<string[]> {
  const row = await ctx.db
    .query("captains")
    .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
    .unique();
  return row?.teams ?? [];
}

async function approvedRows(ctx: QueryCtx | MutationCtx, email: string) {
  const rows = await ctx.db
    .query("members")
    .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
    .collect();
  return rows.filter((r) => r.status === "approved");
}

// Who is signed in and what they may see. null when signed out or without any approved role.
export async function getAccess(ctx: QueryCtx | MutationCtx): Promise<Access | null> {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) return null;
  const email = user.email.toLowerCase();
  const isAdmin = isAdminEmail(email);
  const teams = await captainTeams(ctx, email);
  const rows = await approvedRows(ctx, email);
  const exec = rows.some((r) => r.role === "board" && (r.position === "president" || r.position === "vice-president"));
  const heads = rows.filter((r) => r.role === "board" && (r.position ?? "head") === "head" && r.department).map((r) => r.department!);
  const assoc = rows
    .filter((r) => r.role === "associate" && r.department)
    .map((r) => ({ department: r.department!, teams: r.teams ?? [] }));
  const viewer = rows.some((r) => r.role === "viewer");
  if (!isAdmin && !exec && !heads.length && !assoc.length && !teams.length && !viewer) return null;
  const pres = rows.find((r) => r.role === "board" && r.position === "president");
  const label = isAdmin
    ? "Admin"
    : exec
      ? pres
        ? "President"
        : "Vice-president"
      : heads.length
        ? `Head of ${heads.join(", ")}`
        : assoc.length
          ? `Associate · ${assoc.map((x) => x.department).join(", ")}`
          : teams.length
            ? `Captain · ${[...sportsOf(teams)].join(", ")}`
            : "Student Council (view only)";
  const full = isAdmin || exec || viewer;
  const readOnly = viewer && !isAdmin && !exec && !heads.length && !assoc.length && !teams.length;
  return { email, name: user.name, isAdmin, exec, heads, assoc, teams, viewer, full, readOnly, board: isAdmin || exec || heads.length > 0, label };
}

export async function requireAccess(ctx: QueryCtx | MutationCtx): Promise<Access> {
  const a = await getAccess(ctx);
  if (!a) throw new ConvexError("Not authorised.");
  return a;
}
export async function requireEdit(ctx: QueryCtx | MutationCtx, r: Resource): Promise<Access> {
  const a = await requireAccess(ctx);
  if (!canEdit(a, r)) throw new ConvexError(a.readOnly ? "Your access is view-only." : "Not authorised.");
  return a;
}

// Sports a captain covers (contact messages are routed by sport).
export function sportsOf(teams: string[]): Set<string> {
  return new Set(teams.map(sportOfTeam).filter(Boolean) as string[]);
}

// Used by the sign-up hook (runs in an HTTP action, without direct db access):
// a captain or an approved member may create an account.
export const isCaptainEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<boolean> => {
    if ((await captainTeams(ctx, email)).length > 0) return true;
    return (await approvedRows(ctx, email)).length > 0;
  },
});
