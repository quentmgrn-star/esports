import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { adminEmails } from "./auth";
import { DEPARTMENTS, getAccess, requireAccess, type Access } from "./roles";
import { TEAMS } from "./teamList";

// Who approves what:
//   Admin (ADMIN_EMAILS) -> Board members (heads of department), and everything else.
//   Board member (head of a department) -> associates of their own department; captain requests.
// Nobody can approve their own request.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const roleV = v.union(v.literal("board"), v.literal("associate"), v.literal("captain"));
type Member = Doc<"members">;

function canDecide(a: Access, m: Pick<Member, "role" | "department" | "email">): boolean {
  if (m.email === a.email) return false;
  if (a.isAdmin) return true;
  if (m.role === "associate") return !!m.department && a.board.includes(m.department);
  if (m.role === "captain") return a.board.length > 0;
  return false; // board positions: admin only
}

function clean(args: { email: string; name: string; role: Member["role"]; department?: string; teams?: string[] }) {
  const email = args.email.trim().toLowerCase().slice(0, 200);
  const name = args.name.trim().slice(0, 100);
  if (!EMAIL_RE.test(email)) throw new ConvexError("Enter a valid email address.");
  if (!name) throw new ConvexError("Enter a name.");
  const department = args.role === "captain" ? undefined : args.department;
  if (args.role !== "captain" && (!department || !DEPARTMENTS.includes(department))) throw new ConvexError("Choose a department.");
  const teams = args.role === "captain" ? [...new Set(args.teams ?? [])].filter((t) => TEAMS.some((x) => x.id === t)) : undefined;
  if (args.role === "captain" && !teams?.length) throw new ConvexError("Choose at least one team.");
  return { email, name, role: args.role, department, teams };
}

// Approved captains are also kept in the captains table (it drives messages and try-outs access).
async function addCaptainTeams(ctx: MutationCtx, email: string, name: string, teams: string[]) {
  const row = await ctx.db.query("captains").withIndex("by_email", (q) => q.eq("email", email)).unique();
  if (row) await ctx.db.patch(row._id, { teams: [...new Set([...row.teams, ...teams])], name: row.name ?? name });
  else await ctx.db.insert("captains", { email, name, teams });
}
async function removeCaptainTeams(ctx: MutationCtx, email: string, teams: string[]) {
  const row = await ctx.db.query("captains").withIndex("by_email", (q) => q.eq("email", email)).unique();
  if (!row) return;
  const left = row.teams.filter((t) => !teams.includes(t));
  if (left.length) await ctx.db.patch(row._id, { teams: left });
  else await ctx.db.delete(row._id);
}

// Public "Request access" form (Members page). Board positions are not requested: the admin adds them.
export const requestAccess = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("associate"), v.literal("captain")),
    department: v.optional(v.string()),
    teams: v.optional(v.array(v.string())),
    note: v.optional(v.string()),
    website: v.optional(v.string()), // honeypot
  },
  handler: async (ctx, args) => {
    if (args.website) return null;
    const m = clean(args);
    const mine = await ctx.db.query("members").withIndex("by_email", (q) => q.eq("email", m.email)).collect();
    if (mine.filter((r) => r.status === "requested").length >= 3) throw new ConvexError("You already have requests waiting. Please wait for an answer.");
    if (mine.some((r) => r.status === "requested" && r.role === m.role && r.department === m.department && (r.teams ?? []).join() === (m.teams ?? []).join()))
      throw new ConvexError("This request is already waiting for approval.");
    await ctx.db.insert("members", { ...m, note: args.note?.trim().slice(0, 500) || undefined, status: "requested", requestedAt: Date.now() });
    return true;
  },
});

// Admin or Board: add someone directly (approved straight away, within what they may approve).
export const addMember = mutation({
  args: { email: v.string(), name: v.string(), role: roleV, department: v.optional(v.string()), teams: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const a = await requireAccess(ctx);
    const m = clean(args);
    if (!canDecide(a, m)) throw new ConvexError("You can't add this person with this role.");
    await ctx.db.insert("members", { ...m, status: "approved", requestedAt: Date.now(), decidedBy: a.email, decidedAt: Date.now() });
    if (m.role === "captain") await addCaptainTeams(ctx, m.email, m.name, m.teams!);
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
    if (m.role === "captain" && m.teams) {
      if (decision === "approved") await addCaptainTeams(ctx, m.email, m.name, m.teams);
      if (decision === "revoked") await removeCaptainTeams(ctx, m.email, m.teams);
    }
  },
});

// Requests and members the signed-in person may act on (admin: all; Board: their associates + captains).
export const manageable = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a || (!a.isAdmin && !a.board.length)) return null;
    const rows = await ctx.db.query("members").order("desc").collect();
    return rows.filter((m) => canDecide(a, m)).map((m) => ({ ...m, _id: m._id as Id<"members"> }));
  },
});

async function nameOf(ctx: QueryCtx, email: string) {
  const m = await ctx.db.query("members").withIndex("by_email", (q) => q.eq("email", email)).first();
  return m?.name;
}

// The organisation chart, for signed-in members only.
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return null;
    const approved = await ctx.db.query("members").withIndex("by_status", (q) => q.eq("status", "approved")).collect();
    const admins = await Promise.all(adminEmails().map(async (email) => ({ email, name: (await nameOf(ctx, email)) ?? null })));
    const person = (m: Member) => ({ name: m.name, email: m.email });
    const departments = DEPARTMENTS.map((d) => ({
      name: d,
      heads: approved.filter((m) => m.role === "board" && m.department === d).map(person),
      associates: approved.filter((m) => m.role === "associate" && m.department === d).map(person),
    }));
    const captains = await ctx.db.query("captains").collect();
    const teams = TEAMS.map((t) => ({
      id: t.id,
      captains: captains.filter((c) => c.teams.includes(t.id)).map((c) => ({ name: c.name ?? null, email: c.email })),
    }));
    return { admins, departments, teams };
  },
});

export const departments = query({ args: {}, handler: async (): Promise<string[]> => DEPARTMENTS });
