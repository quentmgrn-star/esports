import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authComponent, isAdminEmail } from "./auth";
import { stageValidator, TEAM_STATUSES } from "./stages";
import { getAccess, requireAccess, sportsOf } from "./roles";
import { TEAMS } from "./teamList";

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user || !isAdminEmail(user.email)) throw new ConvexError("Not authorised.");
  return user;
}

// Who is signed in: admin (ADMIN_EMAILS) and/or the teams they captain.
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    const access = await getAccess(ctx);
    return { name: user.name, email: user.email, isAdmin: isAdminEmail(user.email), teams: access?.teams ?? [] };
  },
});

// Every "Apply to the association" application, newest first. Admins only.
export const listAssociationApplications = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const apps = await ctx.db.query("associationApplications").order("desc").collect();
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
    await requireAdmin(ctx);
    const app = await ctx.db.get(id);
    if (!app) throw new ConvexError("Application not found.");
    if ((app.stage ?? "applied") === stage) return;
    await ctx.db.patch(id, { stage, stageChangedAt: Date.now() });
  },
});

// Internal notes on an application (interview feedback etc.). Admins only.
export const setApplicationNotes = mutation({
  args: { id: v.id("associationApplications"), notes: v.string() },
  handler: async (ctx, { id, notes }) => {
    await requireAdmin(ctx);
    if (!(await ctx.db.get(id))) throw new ConvexError("Application not found.");
    await ctx.db.patch(id, { notes: notes.trim().slice(0, 5000) || undefined });
  },
});

// Contact form messages, newest first. Admins see all; a captain sees the messages about their teams' sports.
export const listContactMessages = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireAccess(ctx);
    const all = await ctx.db.query("contactMessages").order("desc").collect();
    if (a.isAdmin) return all;
    const sports = sportsOf(a.teams);
    return all.filter((m) => m.sport && sports.has(m.sport));
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
    if (!a.isAdmin && !(m.sport && sportsOf(a.teams).has(m.sport))) throw new ConvexError("Not authorised.");
    await ctx.db.patch(id, { status });
  },
});

// Try-out and coach sign-ups, newest first. Admins see every team; a captain sees their own teams.
export const listTeamApplications = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireAccess(ctx);
    const all = await ctx.db.query("teamApplications").order("desc").collect();
    return a.isAdmin ? all : all.filter((x) => a.teams.includes(x.teamSlug));
  },
});

async function editableTeamApp(ctx: MutationCtx, id: Id<"teamApplications">) {
  const a = await requireAccess(ctx);
  const app = await ctx.db.get(id);
  if (!app) throw new ConvexError("Sign-up not found.");
  if (!a.isAdmin && !a.teams.includes(app.teamSlug)) throw new ConvexError("Not authorised.");
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

// ---------- Captains (admins only) ----------
export const listCaptains = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.db.query("captains").collect();
  },
});

// Add a captain, or replace the teams of an existing one (same email).
export const saveCaptain = mutation({
  args: { email: v.string(), name: v.optional(v.string()), teams: v.array(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
