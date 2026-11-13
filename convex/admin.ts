import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authComponent, isAdminEmail } from "./auth";
import { stageValidator, TEAM_STATUSES } from "./stages";
import { canEdit, canSee, getAccess, isExecEditor, requireAccess, type Access, type Resource } from "./roles";
import { TEAMS } from "./teamList";

// Every rule below goes through canSee / canEdit in convex/roles.ts.
const deny = (a: Access) => new ConvexError(a.readOnly ? "Your access is view-only." : "Not authorised.");
async function requireFull(ctx: QueryCtx | MutationCtx) {
  const a = await requireAccess(ctx);
  if (!a.full) throw deny(a);
  return a;
}
// Admin, president and vice-presidents.
async function requireExecEdit(ctx: QueryCtx | MutationCtx) {
  const a = await requireAccess(ctx);
  if (!isExecEditor(a)) throw deny(a);
  return a;
}
// Association applications belong to the departments the applicant chose. Heads see those for their
// department; associates don't see recruitment.
const seesApp = (a: Access, app: { pref1: string; pref2?: string }) =>
  a.full || a.heads.includes(app.pref1) || (!!app.pref2 && a.heads.includes(app.pref2));
async function editableApp(ctx: MutationCtx, id: Id<"associationApplications">) {
  const a = await requireAccess(ctx);
  const app = await ctx.db.get(id);
  if (!app) throw new ConvexError("Application not found.");
  if (a.readOnly || !seesApp(a, app)) throw deny(a);
  return app;
}
// Contact messages: the sport's captains, plus the department the topic belongs to.
const TOPIC_DEPT: Record<string, string> = { "Partnership or business": "Partnerships", "Try-outs": "Operations", Coaching: "Operations" };
const messageRes = (m: { sport?: string; topic: string }): Resource => ({ sport: m.sport, captains: true, dept: TOPIC_DEPT[m.topic] });
// Try-out and coach sign-ups: the team's captains and Operations.
const tryoutRes = (x: { teamSlug: string }): Resource => ({ team: x.teamSlug, captains: true, dept: "Operations" });

// Who is signed in: admin (ADMIN_EMAILS) and/or the teams they captain.
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    const access = await getAccess(ctx);
    return {
      name: user.name,
      email: user.email,
      isAdmin: isAdminEmail(user.email),
      exec: access?.exec ?? false,
      heads: access?.heads ?? [],
      assoc: access?.assoc ?? [],
      teams: access?.teams ?? [],
      viewer: access?.viewer ?? false,
      full: access?.full ?? false,
      readOnly: access?.readOnly ?? false,
      board: access?.board ?? false,
      label: access?.label ?? "",
    };
  },
});

// Every "Apply to the association" application, newest first. Admins only.
export const listAssociationApplications = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireAccess(ctx);
    const apps = (await ctx.db.query("associationApplications").order("desc").collect()).filter((x) => seesApp(a, x));
    return Promise.all(
      apps.map(async (a) => ({
        ...a,
        cvUrl: await ctx.storage.getUrl(a.cvId),
        videoUrl: a.videoId ? await ctx.storage.getUrl(a.videoId) : null,
      })),
    );
  },
});

// Move an application to another recruitment stage. Admins only.
export const setApplicationStage = mutation({
  args: { id: v.id("associationApplications"), stage: stageValidator },
  handler: async (ctx, { id, stage }) => {
    const app = await editableApp(ctx, id);
    if ((app.stage ?? "applied") === stage) return;
    await ctx.db.patch(id, { stage, stageChangedAt: Date.now() });
  },
});

// Internal notes on an application (interview feedback etc.). Admins only.
export const setApplicationNotes = mutation({
  args: { id: v.id("associationApplications"), notes: v.string() },
  handler: async (ctx, { id, notes }) => {
    await editableApp(ctx, id);
    await ctx.db.patch(id, { notes: notes.trim().slice(0, 5000) || undefined });
  },
});

// Contact form messages, newest first. Admins see all; a captain sees the messages about their teams' sports.
export const listContactMessages = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireAccess(ctx);
    const all = await ctx.db.query("contactMessages").order("desc").collect();
    return all.filter((m) => canSee(a, messageRes(m)));
  },
});

export const setContactStatus = mutation({
  args: {
    id: v.id("contactMessages"),
    status: v.union(v.literal("new"), v.literal("read"), v.literal("answered")),
  },
  handler: async (ctx, { id, status }) => {
    const a = await requireAccess(ctx);
    const m = await ctx.db.get(id);
    if (!m) throw new ConvexError("Message not found.");
    if (!canEdit(a, messageRes(m))) throw deny(a);
    await ctx.db.patch(id, { status });
  },
});

// Try-out and coach sign-ups, newest first. Admins see every team; a captain sees their own teams.
export const listTeamApplications = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireAccess(ctx);
    const all = await ctx.db.query("teamApplications").order("desc").collect();
    return all.filter((x) => canSee(a, tryoutRes(x)));
  },
});

async function editableTeamApp(ctx: MutationCtx, id: Id<"teamApplications">) {
  const a = await requireAccess(ctx);
  const app = await ctx.db.get(id);
  if (!app) throw new ConvexError("Sign-up not found.");
  if (!canEdit(a, tryoutRes(app))) throw deny(a);
  return app;
}

export const setTeamApplicationStatus = mutation({
  args: { id: v.id("teamApplications"), status: v.string() },
  handler: async (ctx, { id, status }) => {
    if (!TEAM_STATUSES.includes(status)) throw new ConvexError("Unknown status.");
    const app = await editableTeamApp(ctx, id);
    if (app.status !== status) await ctx.db.patch(id, { status, statusChangedAt: Date.now() });
  },
});

export const setTeamApplicationNotes = mutation({
  args: { id: v.id("teamApplications"), notes: v.string() },
  handler: async (ctx, { id, notes }) => {
    await editableTeamApp(ctx, id);
    await ctx.db.patch(id, { notes: notes.trim().slice(0, 5000) || undefined });
  },
});

// ---------- Captains (seen by admin, president, VPs, viewers; changed by admin, president, VPs) ----------
export const listCaptains = query({
  args: {},
  handler: async (ctx) => {
    await requireFull(ctx);
    return ctx.db.query("captains").collect();
  },
});

// Add a captain, or replace the teams of an existing one (same email).
export const saveCaptain = mutation({
  args: { email: v.string(), name: v.optional(v.string()), teams: v.array(v.string()) },
  handler: async (ctx, args) => {
    await requireExecEdit(ctx);
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError("Enter a valid email address.");
    const teams = [...new Set(args.teams)].filter((t) => TEAMS.some((x) => x.id === t));
    if (teams.length === 0) throw new ConvexError("Choose at least one team.");
    const name = args.name?.trim().slice(0, 100) || undefined;
    const existing = await ctx.db.query("captains").withIndex("by_email", (q) => q.eq("email", email)).unique();
    if (existing) await ctx.db.patch(existing._id, { name: name ?? existing.name, teams });
    else await ctx.db.insert("captains", { email, name, teams });
  },
});

export const removeCaptain = mutation({
  args: { id: v.id("captains") },
  handler: async (ctx, { id }) => {
    await requireExecEdit(ctx);
    await ctx.db.delete(id);
  },
});

// Alumni profiles sent from the website, newest first. Full access only (they include email and phone).
export const listAlumniProfiles = query({
  args: {},
  handler: async (ctx) => {
    await requireFull(ctx);
    return ctx.db.query("alumniProfiles").order("desc").collect();
  },
});

// Approve (publish on the website), reject (hide) or reset to pending. Admins only.
export const setAlumniStatus = mutation({
  args: { id: v.id("alumniProfiles"), status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")) },
  handler: async (ctx, { id, status }) => {
    await requireExecEdit(ctx);
    if (!(await ctx.db.get(id))) throw new ConvexError("Profile not found.");
    await ctx.db.patch(id, { status });
  },
});

// Delete a profile for good (e.g. when the alumnus asks). Admins only.
export const deleteAlumniProfile = mutation({
  args: { id: v.id("alumniProfiles") },
  handler: async (ctx, { id }) => {
    await requireExecEdit(ctx);
    await ctx.db.delete(id);
  },
});
