import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { authComponent, isAdminEmail } from "./auth";
import { stageValidator, TEAM_STATUSES } from "./stages";
import { canEdit, canSee, getAccess, isExecEditor, requireAccess, type Access, type Resource } from "./roles";
import { logActivity } from "./activity";
import { TEAMS, teamLabel } from "./teamList";
import { internal } from "./_generated/api";

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
export const seesApp = (a: Access, app: { pref1: string; pref2?: string }) =>
  a.full || a.heads.includes(app.pref1) || (!!app.pref2 && a.heads.includes(app.pref2));
async function editableApp(ctx: MutationCtx, id: Id<"associationApplications">) {
  const a = await requireAccess(ctx);
  const app = await ctx.db.get(id);
  if (!app) throw new ConvexError("Application not found.");
  if (a.readOnly || !seesApp(a, app)) throw deny(a);
  return app;
}
// Contact messages: the sport's captains, plus the department the topic belongs to.
export const TOPIC_DEPT: Record<string, string> = { "Partnership or business": "Partnerships", "Try-outs": "Operations", Coaching: "Operations" };
const messageRes = (m: { sport?: string; topic: string }): Resource => ({ sport: m.sport, captains: true, dept: TOPIC_DEPT[m.topic] });
// Try-out and coach sign-ups: the team's captains and Operations.
export const tryoutRes = (x: { teamSlug: string }): Resource => ({ team: x.teamSlug, captains: true, dept: "Operations" });

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

// Contact form messages, newest first. Admins and the Board (president, VPs, heads) see all of them;
// a captain sees their teams' sports; an associate sees their department's topics.
export const seesMessage = (a: Access, m: { sport?: string; topic: string }) => a.board || canSee(a, messageRes(m));
export const listContactMessages = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireAccess(ctx);
    const all = await ctx.db.query("contactMessages").order("desc").collect();
    return all.filter((m) => seesMessage(a, m));
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
    if (a.readOnly || !(a.board || canEdit(a, messageRes(m)))) throw deny(a);
    await ctx.db.patch(id, { status });
  },
});

// Reply to a website message from the Hub or /admin: saved on the message, emailed to the sender
// (convex/notify.ts sendReply) and the message is marked "Sent". Needs RESEND_API_KEY and MAIL_FROM on Convex.
export const replyToMessage = mutation({
  args: { id: v.id("contactMessages"), text: v.string() },
  handler: async (ctx, { id, text }) => {
    const a = await requireAccess(ctx);
    const m = await ctx.db.get(id);
    if (!m) throw new ConvexError("Message not found.");
    if (a.readOnly || !(a.board || canEdit(a, messageRes(m)))) throw deny(a);
    const body = text.trim().slice(0, 10000);
    if (!body) throw new ConvexError("Write your reply first.");
    if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM)
      throw new ConvexError("Sending email from the website is not set up yet (RESEND_API_KEY and MAIL_FROM on Convex). Use “Reply in my email app” for now.");
    const replies = [...(m.replies ?? []), { text: body, byName: a.name || a.email, byEmail: a.email, at: Date.now(), emailStatus: "sending" }];
    await ctx.db.patch(id, { replies, status: "answered" });
    await ctx.scheduler.runAfter(0, internal.notify.sendReply, { id, index: replies.length - 1 });
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

async function editableTeamApp(ctx: MutationCtx, id: Id<"teamApplications">): Promise<Doc<"teamApplications"> & { by: Access }> {
  const a = await requireAccess(ctx);
  const app = await ctx.db.get(id);
  if (!app) throw new ConvexError("Sign-up not found.");
  if (!canEdit(a, tryoutRes(app))) throw deny(a);
  return { ...app, by: a };
}

export const setTeamApplicationStatus = mutation({
  args: { id: v.id("teamApplications"), status: v.string() },
  handler: async (ctx, { id, status }) => {
    if (!TEAM_STATUSES.includes(status)) throw new ConvexError("Unknown status.");
    const app = await editableTeamApp(ctx, id);
    if (app.status === status) return;
    await ctx.db.patch(id, { status, statusChangedAt: Date.now() });
    await logActivity(ctx, app.by, app.teamSlug, "signups", `${app.kind === "coach" ? "Coach" : "Try-out"} sign-up of ${app.firstName} ${app.lastName.slice(0, 1)}.: ${app.status} → ${status}`);
  },
});

export const setTeamApplicationNotes = mutation({
  args: { id: v.id("teamApplications"), notes: v.string() },
  handler: async (ctx, { id, notes }) => {
    const app = await editableTeamApp(ctx, id);
    await ctx.db.patch(id, { notes: notes.trim().slice(0, 5000) || undefined });
    await logActivity(ctx, app.by, app.teamSlug, "signups", `Notes updated on the sign-up of ${app.firstName} ${app.lastName.slice(0, 1)}.`);
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

// ---------- Emails that did not go out (admins, President, VPs) ----------
// Every public form sends a confirmation email (convex/mail.ts) and stores the result as `confirmEmail`.
// This lists the ones that failed or were skipped, so a missing confirmation is never silent.
export type EmailProblem = { at: number; form: string; name: string; email: string; about: string; why: string };
const notSent = (s?: string) => !!s && s !== "sent";
export const emailProblems = query({
  args: {},
  handler: async (ctx): Promise<EmailProblem[]> => {
    const a = await getAccess(ctx);
    if (!a || !(a.isAdmin || a.exec)) return [];
    const out: EmailProblem[] = [];
    for (const x of await ctx.db.query("associationApplications").collect())
      if (notSent(x.confirmEmail)) out.push({ at: x._creationTime, form: "Association application", name: `${x.firstName} ${x.lastName}`, email: x.email, about: [x.pref1, x.pref2].filter(Boolean).join(", "), why: x.confirmEmail! });
    for (const x of await ctx.db.query("teamApplications").collect())
      if (notSent(x.confirmEmail))
        out.push({ at: x._creationTime, form: x.kind === "coach" ? "Coach application" : x.track === "social" ? "Just for fun sign-up" : "Try-out sign-up", name: `${x.firstName} ${x.lastName}`, email: x.email, about: teamLabel(x.teamSlug), why: x.confirmEmail! });
    for (const x of await ctx.db.query("alumniProfiles").collect())
      if (notSent(x.confirmEmail)) out.push({ at: x._creationTime, form: "Alumni profile", name: `${x.first} ${x.last}`, email: x.email, about: "", why: x.confirmEmail! });
    for (const x of await ctx.db.query("members").collect())
      if (notSent(x.confirmEmail)) out.push({ at: x._creationTime, form: "Hub access request", name: x.name, email: x.email, about: x.role === "captain" ? "Captain" : `${x.department ?? ""} associate`, why: x.confirmEmail! });
    for (const x of await ctx.db.query("partnerInquiries").collect())
      if (notSent(x.confirmEmail)) out.push({ at: x._creationTime, form: "Partner enquiry", name: x.name, email: x.email, about: x.company, why: x.confirmEmail! });
    for (const x of await ctx.db.query("contactMessages").collect()) {
      if (notSent(x.confirmEmail)) out.push({ at: x._creationTime, form: "Contact message", name: x.name, email: x.email, about: x.subject, why: x.confirmEmail! });
      if (x.emailStatus?.startsWith("failed")) out.push({ at: x._creationTime, form: "Contact message (copy to captains/admins)", name: x.name, email: x.email, about: x.subject, why: x.emailStatus });
    }
    for (const x of await ctx.db.query("passwordEvents").collect())
      if (x.kind === "reset-email" && notSent(x.emailStatus) && x.emailStatus !== "sending")
        out.push({ at: x.at, form: "Forgot password (reset link)", name: x.email, email: x.email, about: "", why: x.emailStatus! });
    return out.sort((p, q) => q.at - p.at).slice(0, 100);
  },
});
