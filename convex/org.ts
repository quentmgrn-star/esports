import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { adminEmails } from "./auth";
import { DEPARTMENTS, getAccess, requireAccess, type Access } from "./roles";
import { TEAMS } from "./teamList";
import { internal } from "./_generated/api";

// Who approves, adds or removes whom (never yourself; view-only people do nothing):
//   Admin ............................. everyone
//   President, Vice-president ......... everyone except the President (only an admin adds, changes or removes the President)
//   Head of department ................ adds associates of their own department, captains and vice-captains;
//                                       approves their department's associate requests and captain requests
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const roleV = v.union(v.literal("board"), v.literal("associate"), v.literal("captain"), v.literal("vicecaptain"), v.literal("viewer"));
// Captains and vice-captains have the same access to their team(s).
export const isCaptainRole = (role: string) => role === "captain" || role === "vicecaptain";
const positionV = v.optional(v.union(v.literal("president"), v.literal("vice-president"), v.literal("head")));
type Member = Doc<"members">;

const isPresident = (m: Pick<Member, "role" | "position">) => m.role === "board" && m.position === "president";

export function canDecide(a: Access, m: Pick<Member, "role" | "department" | "email" | "position">): boolean {
  if (m.email === a.email || a.readOnly) return false;
  if (a.isAdmin) return true;
  if (a.exec) return !isPresident(m);
  if (m.role === "associate") return !!m.department && a.heads.includes(m.department);
  if (isCaptainRole(m.role)) return a.heads.length > 0;
  return false; // Board positions and viewers: admin, President and VPs only
}
// Adding someone directly (no request): admin, President and VPs add anyone;
// a head of department adds associates of their own department, and captains / vice-captains.
export function canAdd(a: Access, m: Pick<Member, "role" | "department" | "email" | "position">): boolean {
  if (m.email === a.email || a.readOnly) return false;
  if (a.isAdmin) return true;
  if (a.exec) return !isPresident(m);
  if (!a.heads.length) return false;
  if (isCaptainRole(m.role)) return true;
  return m.role === "associate" && !!m.department && a.heads.includes(m.department);
}

function clean(args: { email: string; name: string; role: Member["role"]; position?: Member["position"]; department?: string; teams?: string[] }) {
  const email = args.email.trim().toLowerCase().slice(0, 200);
  const name = args.name.trim().slice(0, 100);
  if (!EMAIL_RE.test(email)) throw new ConvexError("Enter a valid email address.");
  if (!name) throw new ConvexError("Enter a name.");
  const position = args.role === "board" ? args.position ?? "head" : undefined;
  const needsDept = args.role === "associate" || position === "head";
  const department = needsDept ? args.department : undefined;
  if (needsDept && (!department || !DEPARTMENTS.includes(department))) throw new ConvexError("Choose a department.");
  const needsTeams = args.role === "associate" || isCaptainRole(args.role);
  const teams = needsTeams ? [...new Set(args.teams ?? [])].filter((t) => TEAMS.some((x) => x.id === t)) : undefined;
  if (needsTeams && !teams?.length) throw new ConvexError("Choose at least one team.");
  return { email, name, role: args.role, position, department, teams };
}

// Approved captains and vice-captains are also kept in the captains table (it drives messages,
// try-outs, chat and every other captain access). `vice` lists the teams where they are vice-captain.
async function addCaptainTeams(ctx: MutationCtx, email: string, name: string, teams: string[], vice = false) {
  const row = await ctx.db.query("captains").withIndex("by_email", (q) => q.eq("email", email)).unique();
  const old = row?.vice ?? [];
  const viceTeams = vice ? [...new Set([...old, ...teams])] : old.filter((t) => !teams.includes(t));
  const v = viceTeams.length ? viceTeams : undefined;
  if (row) await ctx.db.patch(row._id, { teams: [...new Set([...row.teams, ...teams])], name: row.name ?? name, vice: v });
  else await ctx.db.insert("captains", { email, name, teams, vice: v });
}
async function removeCaptainTeams(ctx: MutationCtx, email: string, teams: string[]) {
  const row = await ctx.db.query("captains").withIndex("by_email", (q) => q.eq("email", email)).unique();
  if (!row) return;
  const left = row.teams.filter((t) => !teams.includes(t));
  const vice = (row.vice ?? []).filter((t) => left.includes(t));
  if (left.length) await ctx.db.patch(row._id, { teams: left, vice: vice.length ? vice : undefined });
  else await ctx.db.delete(row._id);
}

// Public "Request access" form (Members page). Board positions are not requested: the admin adds them.
export const requestAccess = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("associate"), v.literal("captain"), v.literal("vicecaptain")),
    department: v.optional(v.string()),
    teams: v.optional(v.array(v.string())), // associates: the teams they work with; captains: their team(s)
    note: v.optional(v.string()),
    website: v.optional(v.string()), // honeypot
    lang: v.optional(v.string()), // for the confirmation email
  },
  handler: async (ctx, args) => {
    if (args.website) return null;
    const m = clean(args);
    const mine = await ctx.db.query("members").withIndex("by_email", (q) => q.eq("email", m.email)).collect();
    if (mine.filter((r) => r.status === "requested").length >= 3) throw new ConvexError("You already have requests waiting. Please wait for an answer.");
    if (mine.some((r) => r.status === "requested" && r.role === m.role && r.department === m.department && (r.teams ?? []).join() === (m.teams ?? []).join()))
      throw new ConvexError("This request is already waiting for approval.");
    const id = await ctx.db.insert("members", { ...m, note: args.note?.trim().slice(0, 500) || undefined, status: "requested", requestedAt: Date.now() });
    const as = m.role === "captain" ? "captain" : m.role === "vicecaptain" ? "vice-captain" : `${m.department} associate`;
    await ctx.scheduler.runAfter(0, internal.mail.confirm, { to: m.email, name: m.name.split(" ")[0], kind: "access", about: as, lang: args.lang, table: "members", id });
    return true;
  },
});

// Admin, President/VP or head: add someone directly (approved straight away, see canAdd).
export const addMember = mutation({
  args: { email: v.string(), name: v.string(), role: roleV, position: positionV, department: v.optional(v.string()), teams: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const a = await requireAccess(ctx);
    const m = clean(args);
    if (!canAdd(a, m))
      throw new ConvexError(isPresident(m) && a.exec ? "Only an admin can add or change the President." : a.heads.length && !a.exec && !a.isAdmin ? "As head of department you can add associates to your own department, captains and vice-captains." : "You can't add this person with this role.");
    const dup = await ctx.db.query("members").withIndex("by_email", (q) => q.eq("email", m.email)).collect();
    if (dup.some((r) => r.status === "approved" && r.role === m.role && r.position === m.position && r.department === m.department && (r.teams ?? []).join() === (m.teams ?? []).join()))
      throw new ConvexError("This person already has this role.");
    await ctx.db.insert("members", { ...m, status: "approved", requestedAt: Date.now(), decidedBy: a.email, decidedAt: Date.now() });
    if (isCaptainRole(m.role)) await addCaptainTeams(ctx, m.email, m.name, m.teams!, m.role === "vicecaptain");
  },
});

// Approve or reject a request, or revoke an approved member.
export const decide = mutation({
  args: { id: v.id("members"), decision: v.union(v.literal("approved"), v.literal("rejected"), v.literal("revoked")) },
  handler: async (ctx, { id, decision }) => {
    const a = await requireAccess(ctx);
    const m = await ctx.db.get(id);
    if (!m) throw new ConvexError("Request not found.");
    if (!canDecide(a, m)) throw new ConvexError("You can't decide on this request.");
    if (decision === "revoked" && m.status !== "approved") throw new ConvexError("Only approved members can be removed.");
    if (decision !== "revoked" && m.status !== "requested") throw new ConvexError("This request was already decided.");
    await ctx.db.patch(id, { status: decision, decidedBy: a.email, decidedAt: Date.now() });
    if (isCaptainRole(m.role) && m.teams) {
      if (decision === "approved") await addCaptainTeams(ctx, m.email, m.name, m.teams, m.role === "vicecaptain");
      if (decision === "revoked") await removeCaptainTeams(ctx, m.email, m.teams);
    }
  },
});

// Requests and members the signed-in person may act on (admin, President, VPs: all; heads: their associates + captains).
export const manageable = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a || !a.board || a.readOnly) return null;
    const rows = await ctx.db.query("members").order("desc").collect();
    return rows.filter((m) => canDecide(a, m)).map((m) => ({ ...m, _id: m._id as Id<"members"> }));
  },
});

async function nameOf(ctx: QueryCtx, email: string) {
  const m = await ctx.db.query("members").withIndex("by_email", (q) => q.eq("email", email)).first();
  return m?.name;
}

// The organisation chart. Full version (/admin Organisation tab): admins, President, VPs.
// Other members get a trimmed version for the Hub (who looks after which team).
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return null;
    const approved = await ctx.db.query("members").withIndex("by_status", (q) => q.eq("status", "approved")).collect();
    const admins = await Promise.all(adminEmails().map(async (email) => ({ email, name: (await nameOf(ctx, email)) ?? null })));
    const person = (m: Member) => ({ name: m.name, email: m.email, teams: m.teams ?? [] });
    const board = approved.filter((m) => m.role === "board");
    const exec = board
      .filter((m) => m.position === "president" || m.position === "vice-president")
      .map((m) => ({ ...person(m), position: m.position === "president" ? "President" : "Vice-president" }));
    const departments = DEPARTMENTS.map((d) => ({
      name: d,
      heads: board.filter((m) => (m.position ?? "head") === "head" && m.department === d).map(person),
      associates: approved.filter((m) => m.role === "associate" && m.department === d).map(person),
    }));
    const viewers = approved.filter((m) => m.role === "viewer").map(person);
    const captains = await ctx.db.query("captains").collect();
    const teams = TEAMS.map((t) => ({
      id: t.id,
      // captains first, then vice-captains
      captains: captains
        .filter((c) => c.teams.includes(t.id))
        .map((c) => ({ name: c.name ?? null, email: c.email, vice: (c.vice ?? []).includes(t.id) }))
        .sort((x, y) => Number(x.vice) - Number(y.vice)),
    }));
    // The full list (admins, view-only accounts, every email) is the /admin Organisation tab:
    // admins, the President and the Vice-presidents only. Everyone else gets what the Hub needs.
    if (a.isAdmin || a.exec) return { admins, exec, departments, teams, viewers };
    // A captain (no Board or associate role) only gets the people who look after their own team(s):
    // the President / VPs, the heads, the associates assigned to their team(s) and their own team's captains.
    // No other teams, no admins, no view-only accounts.
    if (!a.full && !a.board && !a.assoc.length) {
      const mine = (p: { teams: string[] }) => ({ ...p, teams: p.teams.filter((t) => a.teams.includes(t)) });
      return {
        admins: [],
        exec,
        departments: departments.map((d) => ({ ...d, associates: d.associates.map(mine).filter((x) => x.teams.length) })),
        teams: teams.filter((t) => a.teams.includes(t.id)),
        viewers: [],
      };
    }
    return { admins: [], exec, departments, teams, viewers: [] };
  },
});

export const departments = query({ args: {}, handler: async (): Promise<string[]> => DEPARTMENTS });
