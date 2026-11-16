import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { authComponent, isAdminEmail } from "./auth";
import { stageValidator, TEAM_STATUSES } from "./stages";
import { canEdit, canSee, getAccess, isExecEditor, requireAccess, type Access, type Resource } from "./roles";
import { logActivity } from "./activity";
import { TEAMS, teamLabel } from "./teamList";
import { internal } from "./_generated/api";
import { fileLinks } from "./files";

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
        moreDocLinks: await fileLinks(ctx, { files: a.moreDocs }),
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

// Opening an application in the Hub marks it as seen (it leaves the bell and the badge); "Mark as unread" puts it back.
export const markApplicationOpened = mutation({
  args: { id: v.id("associationApplications"), opened: v.boolean() },
  handler: async (ctx, { id, opened }) => {
    await editableApp(ctx, id);
    await ctx.db.patch(id, { openedAt: opened ? Date.now() : undefined });
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

export const markTeamApplicationOpened = mutation({
  args: { id: v.id("teamApplications"), opened: v.boolean() },
  handler: async (ctx, { id, opened }) => {
    await editableTeamApp(ctx, id);
    await ctx.db.patch(id, { openedAt: opened ? Date.now() : undefined });
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
  args: { email: v.string(), name: v.optional(v.string()), teams: v.array(v.string()), vice: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireExecEdit(ctx);
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError("Enter a valid email address.");
    const teams = [...new Set(args.teams)].filter((t) => TEAMS.some((x) => x.id === t));
    if (teams.length === 0) throw new ConvexError("Choose at least one team.");
    const name = args.name?.trim().slice(0, 100) || undefined;
    const existing = await ctx.db.query("captains").withIndex("by_email", (q) => q.eq("email", email)).unique();
    // vice: true = vice-captain of all these teams; false = captain; not sent = keep what they were
    const viceTeams = args.vice === undefined ? (existing?.vice ?? []).filter((t) => teams.includes(t)) : args.vice ? teams : [];
    const vice = viceTeams.length ? viceTeams : undefined;
    if (existing) await ctx.db.patch(existing._id, { name: name ?? existing.name, teams, vice });
    else await ctx.db.insert("captains", { email, name, teams, vice });
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

// ---------- Emails that did not go out ----------
// Every public form sends a confirmation email (convex/mail.ts) and stores the result as `confirmEmail`.
// This lists the ones that failed, so a missing confirmation is never silent. Each one is shown to the
// people who handle that kind of form (rules in `who` below, all checked here on the server):
//   partner enquiry ........ Partnerships          association application ... heads of the chosen departments
//   try-out / coach ........ the team's captains + Operations for that team
//   contact message ........ the sport's captains + Operations (and the topic's department)
//   alumni profile ......... admins, President, VPs  Hub access request ....... the Board (heads: their department)
// Admins, President, VPs and the IT department (head + associates) see every one.
export type EmailProblem = {
  key: string;
  cat: "partner" | "association" | "tryout" | "contact" | "alumni" | "access" | "password";
  at: number;
  form: string;
  name: string;
  email: string;
  about: string;
  why: string;
  canRetry: boolean;
  handledBy?: string;
  handledAt?: number;
};
type Problem = Omit<EmailProblem, "handledBy" | "handledAt"> & { who: (a: Access) => boolean };
const notSent = (s?: string) => !!s && s !== "sent" && s !== "sending";
const isIT = (a: Access) => a.heads.includes("IT") || a.assoc.some((d) => d.department === "IT");
const seesAllMail = (a: Access) => a.isAdmin || a.exec || isIT(a);
// Same as canSee, but the view-only account does not get these working lists.
const sees = (a: Access, r: Resource) => canSee({ ...a, full: false }, r);
const appKind = (x: Doc<"teamApplications">) => (x.kind === "coach" ? "coach" : x.track === "social" ? "social" : "tryout");

async function allProblems(ctx: QueryCtx | MutationCtx): Promise<Problem[]> {
  const out: Problem[] = [];
  for (const x of await ctx.db.query("associationApplications").collect())
    if (notSent(x.confirmEmail))
      out.push({ key: `associationApplications:${x._id}`, cat: "association", canRetry: true, at: x._creationTime, form: "Association application", name: `${x.firstName} ${x.lastName}`, email: x.email, about: [x.pref1, x.pref2].filter(Boolean).join(", "), why: x.confirmEmail!,
        who: (a) => a.heads.includes(x.pref1) || (!!x.pref2 && a.heads.includes(x.pref2)) });
  for (const x of await ctx.db.query("teamApplications").collect())
    if (notSent(x.confirmEmail)) {
      const k = appKind(x);
      out.push({ key: `teamApplications:${x._id}`, cat: "tryout", canRetry: true, at: x._creationTime, form: k === "coach" ? "Coach application" : k === "social" ? "Just for fun sign-up" : "Try-out sign-up", name: `${x.firstName} ${x.lastName}`, email: x.email, about: teamLabel(x.teamSlug), why: x.confirmEmail!,
        who: (a) => sees(a, tryoutRes(x)) });
    }
  for (const x of await ctx.db.query("alumniProfiles").collect())
    if (notSent(x.confirmEmail))
      out.push({ key: `alumniProfiles:${x._id}`, cat: "alumni", canRetry: true, at: x._creationTime, form: "Alumni profile", name: `${x.first} ${x.last}`, email: x.email, about: "", why: x.confirmEmail!, who: () => false });
  for (const x of await ctx.db.query("members").collect())
    if (notSent(x.confirmEmail))
      out.push({ key: `members:${x._id}`, cat: "access", canRetry: true, at: x._creationTime, form: "Hub access request", name: x.name, email: x.email, about: x.role === "captain" ? "Captain" : x.role === "vicecaptain" ? "Vice-captain" : `${x.department ?? ""} associate`, why: x.confirmEmail!,
        who: (a) => (x.role === "captain" || x.role === "vicecaptain" || !x.department ? a.board : a.heads.includes(x.department)) });
  for (const x of await ctx.db.query("partnerInquiries").collect())
    if (notSent(x.confirmEmail))
      out.push({ key: `partnerInquiries:${x._id}`, cat: "partner", canRetry: true, at: x._creationTime, form: "Partner enquiry", name: x.name, email: x.email, about: x.company, why: x.confirmEmail!,
        who: (a) => sees(a, { dept: "Partnerships" }) });
  for (const x of await ctx.db.query("contactMessages").collect()) {
    const who = (a: Access) => sees(a, messageRes(x)) || (!!x.sport && sees(a, { sport: x.sport, dept: "Operations" }));
    if (notSent(x.confirmEmail))
      out.push({ key: `contactMessages:${x._id}`, cat: "contact", canRetry: true, at: x._creationTime, form: "Contact message", name: x.name, email: x.email, about: x.subject, why: x.confirmEmail!, who });
    if (x.emailStatus?.startsWith("failed"))
      out.push({ key: `contactCopy:${x._id}`, cat: "contact", canRetry: true, at: x._creationTime, form: "Contact message (copy to captains/admins)", name: x.name, email: x.email, about: x.subject, why: x.emailStatus, who });
  }
  for (const x of await ctx.db.query("passwordEvents").collect())
    if (x.kind === "reset-email" && notSent(x.emailStatus))
      out.push({ key: `passwordEvents:${x._id}`, cat: "password", canRetry: false, at: x.at, form: "Forgot password (reset link)", name: x.email, email: x.email, about: "", why: x.emailStatus!, who: () => false });
  return out;
}
const canHandle = (a: Access, p: Problem) => seesAllMail(a) || p.who(a);

export const emailProblems = query({
  args: {},
  handler: async (ctx): Promise<EmailProblem[]> => {
    const a = await getAccess(ctx);
    if (!a) return [];
    const done = new Map((await ctx.db.query("emailHandled").collect()).map((h) => [h.key, h]));
    return (await allProblems(ctx))
      .filter((p) => canHandle(a, p))
      .sort((p, q) => q.at - p.at)
      .slice(0, 100)
      .map(({ who: _who, ...p }) => {
        const h = done.get(p.key);
        return h ? { ...p, handledBy: h.by, handledAt: h.at } : p;
      });
  },
});

async function problemFor(ctx: MutationCtx, key: string) {
  const a = await requireAccess(ctx);
  const p = (await allProblems(ctx)).find((x) => x.key === key);
  if (!p) throw new ConvexError("This email is no longer in the list.");
  if (a.readOnly || !canHandle(a, p)) throw deny(a);
  return { a, p };
}

// "I wrote to them": hides the warning for everyone and records who did it. undo puts it back.
export const markEmailHandled = mutation({
  args: { key: v.string(), undo: v.optional(v.boolean()) },
  handler: async (ctx, { key, undo }) => {
    const { a } = await problemFor(ctx, key);
    for (const h of await ctx.db.query("emailHandled").withIndex("by_key", (q) => q.eq("key", key)).collect()) await ctx.db.delete(h._id);
    if (!undo) await ctx.db.insert("emailHandled", { key, by: a.name || a.email, byEmail: a.email, at: Date.now() });
  },
});

// Try the email again (same text, in English). Only goes through once a sending domain is verified in Resend.
export const resendEmail = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const { p } = await problemFor(ctx, key);
    if (!p.canRetry) throw new ConvexError("This email cannot be sent again from here.");
    const [table, raw] = key.split(":");
    const send = (args: { to: string; name?: string; kind: string; about?: string }) =>
      ctx.scheduler.runAfter(0, internal.mail.confirm, { ...args, table, id: raw });
    const first = (s: string) => s.split(" ")[0];
    if (table === "contactCopy") {
      const id = ctx.db.normalizeId("contactMessages", raw);
      if (!id) throw new ConvexError("Message not found.");
      await ctx.db.patch(id, { emailStatus: "sending" });
      await ctx.scheduler.runAfter(0, internal.notify.emailContactMessage, { id });
      return;
    }
    if (table === "teamApplications") {
      const x = await ctx.db.get(ctx.db.normalizeId("teamApplications", raw)!);
      if (x) { await ctx.db.patch(x._id, { confirmEmail: "sending" }); await send({ to: x.email, name: x.firstName, kind: appKind(x), about: teamLabel(x.teamSlug) }); }
    } else if (table === "partnerInquiries") {
      const x = await ctx.db.get(ctx.db.normalizeId("partnerInquiries", raw)!);
      if (x) { await ctx.db.patch(x._id, { confirmEmail: "sending" }); await send({ to: x.email, name: first(x.name), kind: "partner", about: x.company }); }
    } else if (table === "associationApplications") {
      const x = await ctx.db.get(ctx.db.normalizeId("associationApplications", raw)!);
      if (x) { await ctx.db.patch(x._id, { confirmEmail: "sending" }); await send({ to: x.email, name: x.firstName, kind: "association", about: [x.pref1, x.pref2].filter(Boolean).join(", ") }); }
    } else if (table === "contactMessages") {
      const x = await ctx.db.get(ctx.db.normalizeId("contactMessages", raw)!);
      if (x) { await ctx.db.patch(x._id, { confirmEmail: "sending" }); await send({ to: x.email, name: first(x.name), kind: "contact", about: x.subject }); }
    } else if (table === "alumniProfiles") {
      const x = await ctx.db.get(ctx.db.normalizeId("alumniProfiles", raw)!);
      if (x) { await ctx.db.patch(x._id, { confirmEmail: "sending" }); await send({ to: x.email, name: x.first, kind: "alumni" }); }
    } else if (table === "members") {
      const x = await ctx.db.get(ctx.db.normalizeId("members", raw)!);
      if (x) { await ctx.db.patch(x._id, { confirmEmail: "sending" }); await send({ to: x.email, name: first(x.name), kind: "access", about: x.role === "captain" ? "captain" : x.role === "vicecaptain" ? "vice-captain" : `${x.department} associate` }); }
    }
  },
});
