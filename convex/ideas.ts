import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { canEdit, canSee, getAccess, requireAccess, type Access } from "./roles";
import { TEAMS } from "./teamList";
import { notify } from "./notifications";

// Ideas & logistics (friendlies, tournaments, jerseys, travel, facilities):
//   1. A captain suggests an idea → Operations is notified and researches it.
//      Or Operations comes up with an idea itself.
//   2. Operations sends it to the captain with a comment. If it needs money ("budget"), an expense request
//      goes into the ledger and Finance is notified, exactly as if the captain had requested it.
//      If it only concerns the team ("team": a friendly, a jersey idea), only the captain is notified.
//   3. The captain approves (or declines) → Marketing is notified.
//   4. Marketing communicates it on the media accounts or as platform news and marks it done → the captain is notified.
// Seen by: the team's captains, Operations, Finance and Marketing for the team, President, VPs, admins, Student Council.
const OPS = "Operations", FIN = "Finance", MKT = "Media & Marketing";
const sees = (a: Access, team: string) =>
  canSee(a, { team, dept: OPS, captains: true }) || canSee(a, { team, dept: FIN }) || canSee(a, { team, dept: MKT });
const ops = (a: Access, team: string) => canEdit(a, { team, dept: OPS });
const captain = (a: Access, team: string) => !a.readOnly && (a.teams.includes(team) || a.isAdmin || a.exec);
const marketing = (a: Access, team: string) => canEdit(a, { team, dept: MKT });
const who = (a: Access) => `${a.name || a.email.split("@")[0]} (${a.label})`;
export const KINDS = ["Friendly game", "Tournament", "Jerseys / kit", "Travel / logistics", "Training facility", "League facility", "Other"];
const CAT: Record<string, string> = { "Friendly game": "Facilities", Tournament: "League fees", "Jerseys / kit": "Kit", "Travel / logistics": "Travel", "Training facility": "Facilities", "League facility": "Facilities" };
const teamName = (id: string) => { const t = TEAMS.find((x) => x.id === id); return t ? `${t.sport} · ${t.squad}` : id; };

export const list = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return [];
    const rows = await ctx.db.query("ideas").collect();
    return rows
      .filter((r) => sees(a, r.team))
      .map((r) => ({
        ...r,
        canUpdate: ops(a, r.team), // Operations actions
        canApprove: r.status === "awaiting" && captain(a, r.team),
        canCommunicate: r.status === "approved" && marketing(a, r.team),
        canComment: !a.readOnly,
      }))
      .sort((x, y) => y.at - x.at);
  },
});

async function load(ctx: { db: { get: (id: Id<"ideas">) => Promise<Doc<"ideas"> | null> } }, id: Id<"ideas">) {
  const r = await ctx.db.get(id);
  if (!r) throw new ConvexError("This idea no longer exists.");
  return r;
}

// A captain (or Operations) suggests an idea. From Operations it goes straight to the captain with its comment.
export const suggest = mutation({
  args: {
    team: v.string(),
    kind: v.string(),
    text: v.string(),
    concerns: v.optional(v.union(v.literal("budget"), v.literal("team"))),
    estimate: v.optional(v.number()),
  },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    if (!TEAMS.some((t) => t.id === x.team)) throw new ConvexError("Unknown team.");
    if (!canEdit(a, { team: x.team, dept: OPS, captains: true })) throw new ConvexError(a.readOnly ? "Your access is view-only." : "Only the team's captains and Operations can add ideas.");
    const text = x.text.trim().slice(0, 600);
    if (!text) throw new ConvexError("Describe the idea.");
    const fromOps = ops(a, x.team) && !a.teams.includes(x.team);
    const kind = KINDS.includes(x.kind) ? x.kind : "Other";
    const id = await ctx.db.insert("ideas", {
      team: x.team, kind, text, status: fromOps ? "researching" : "new", origin: fromOps ? "ops" : "captain",
      by: who(a), byEmail: a.email, at: Date.now(), comments: [],
    });
    if (fromOps) await sendToCaptain(ctx, a, id, x.concerns ?? "team", x.estimate, undefined);
    else await notify(ctx, a, { team: x.team, dept: OPS, title: `New idea from the captain: ${kind}`, body: `${teamName(x.team)} · ${text.slice(0, 160)}`, link: "hub-ideas" });
    return null;
  },
});

// Operations sends the idea to the captain. Budget → an expense request for Finance, as if the captain had made it.
async function sendToCaptain(ctx: Parameters<typeof notify>[0], a: Access, id: Id<"ideas">, concerns: "budget" | "team", estimate: number | undefined, comment: string | undefined) {
  const r = await load(ctx, id);
  const now = Date.now();
  let expenseId = r.expenseId;
  if (concerns === "budget") {
    const amount = Math.round(estimate ?? r.estimate ?? 0);
    if (!(amount > 0)) throw new ConvexError("Add the estimated cost: it becomes the expense request for Finance.");
    if (!expenseId) {
      expenseId = await ctx.db.insert("expenses", {
        team: r.team, dept: OPS, item: `${r.kind}: ${r.text}`.slice(0, 140), cat: CAT[r.kind] ?? "Other", amount,
        date: new Date(now).toISOString().slice(0, 10), status: "requested", by: who(a), byEmail: a.email,
        history: [{ action: "requested", by: who(a), at: now, reason: "From Ideas & logistics" }], isExample: false,
      });
      await notify(ctx, a, { team: r.team, dept: FIN, title: `New expense request: ${r.kind}`, body: `${teamName(r.team)} · €${amount} · from Operations`, link: "hub-expenses" });
    }
  }
  const comments = [...(r.comments ?? [])];
  if (comment?.trim()) comments.push({ by: who(a), at: now, text: comment.trim().slice(0, 600) });
  await ctx.db.patch(id, {
    status: "awaiting", concerns, expenseId, estimate: estimate && estimate > 0 ? Math.round(estimate) : r.estimate,
    comments, updatedBy: who(a), updatedAt: now,
  });
  await notify(ctx, a, { team: r.team, captains: true, title: `Operations needs your approval: ${r.kind}`, body: comment?.trim() || r.text.slice(0, 160), link: "hub-ideas" });
}

export const update = mutation({
  args: {
    id: v.id("ideas"),
    action: v.union(v.literal("research"), v.literal("send"), v.literal("drop"), v.literal("note")),
    concerns: v.optional(v.union(v.literal("budget"), v.literal("team"))),
    opsNote: v.optional(v.string()),
    estimate: v.optional(v.number()),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    const r = await load(ctx, x.id);
    if (!ops(a, r.team)) throw new ConvexError("Only Operations for this team can do this.");
    const base = { opsNote: x.opsNote?.trim().slice(0, 1000) || r.opsNote, estimate: x.estimate && x.estimate > 0 ? Math.round(x.estimate) : r.estimate, updatedBy: who(a), updatedAt: Date.now() };
    if (x.action === "send") {
      await ctx.db.patch(x.id, base);
      await sendToCaptain(ctx, a, x.id, x.concerns ?? "team", base.estimate, x.comment);
    } else if (x.action === "drop") await ctx.db.patch(x.id, { ...base, status: "dropped" });
    else await ctx.db.patch(x.id, { ...base, status: x.action === "research" ? "researching" : r.status === "new" ? "researching" : r.status });
    return null;
  },
});

// The captain approves → Marketing is notified; declines → Operations is notified.
export const decide = mutation({
  args: { id: v.id("ideas"), approve: v.boolean(), comment: v.optional(v.string()) },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    const r = await load(ctx, x.id);
    if (r.status !== "awaiting") throw new ConvexError("This idea is not waiting for approval.");
    if (!captain(a, r.team)) throw new ConvexError("Only the team's captain can approve it.");
    const now = Date.now(), comments = [...(r.comments ?? [])];
    if (x.comment?.trim()) comments.push({ by: who(a), at: now, text: x.comment.trim().slice(0, 600) });
    await ctx.db.patch(x.id, { status: x.approve ? "approved" : "dropped", comments, updatedBy: who(a), updatedAt: now });
    if (x.approve) {
      await notify(ctx, a, { team: r.team, dept: MKT, title: `To communicate: ${r.kind}`, body: `${teamName(r.team)} · approved by the captain. Post it on the media accounts or as platform news.`, link: "hub-ideas" });
      await notify(ctx, a, { team: r.team, dept: OPS, title: `Approved by the captain: ${r.kind}`, body: teamName(r.team), link: "hub-ideas" });
    } else await notify(ctx, a, { team: r.team, dept: OPS, title: `Declined by the captain: ${r.kind}`, body: x.comment?.trim() || teamName(r.team), link: "hub-ideas" });
    return null;
  },
});

// Marketing: communicated on the media accounts or as platform news → the captain is notified.
export const communicated = mutation({
  args: { id: v.id("ideas"), channel: v.union(v.literal("media"), v.literal("news")) },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    const r = await load(ctx, x.id);
    if (r.status !== "approved") throw new ConvexError("Only approved ideas can be marked as communicated.");
    if (!marketing(a, r.team)) throw new ConvexError("Only Marketing for this team can do this.");
    await ctx.db.patch(x.id, { status: "communicated", channel: x.channel, updatedBy: who(a), updatedAt: Date.now() });
    await notify(ctx, a, { team: r.team, captains: true, title: `Communicated: ${r.kind}`, body: x.channel === "media" ? "Posted on the media accounts." : "Published as platform news.", link: "hub-ideas" });
    return null;
  },
});

export const comment = mutation({
  args: { id: v.id("ideas"), text: v.string() },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    const r = await load(ctx, x.id);
    if (a.readOnly || !sees(a, r.team)) throw new ConvexError("Not authorised.");
    const text = x.text.trim().slice(0, 600);
    if (!text) return null;
    await ctx.db.patch(x.id, { comments: [...(r.comments ?? []), { by: who(a), at: Date.now(), text }] });
    return null;
  },
});
