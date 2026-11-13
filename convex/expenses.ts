import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { DEPARTMENTS, canEdit, canSee, getAccess, requireAccess, type Access } from "./roles";
import { TEAMS } from "./teamList";

// Expenses ledger. Who sees what (convex/roles.ts):
//   captains: their team · associates: their department for their teams · heads: their department for every team
//   Finance (associates for their teams, the head for all): every expense, because Finance validates them
//   president, VPs, admins and Student Council: everything (Student Council read-only)
// Decisions: Finance for the team (associate or head), president, VPs, admins. Paying: head of Finance, president, VPs, admins.
// Reconsidering a decision: the person who took it, or anyone above them (head of Finance, president, VPs, admins).

const FIN = "Finance";
const seesExpense = (a: Access, e: { team: string; dept: string }) =>
  canSee(a, { team: e.team, dept: e.dept, captains: true }) || canSee(a, { team: e.team, dept: FIN });
const decides = (a: Access, team: string) => canEdit(a, { team, dept: FIN });
const pays = (a: Access) => !a.readOnly && (a.isAdmin || a.exec || a.heads.includes(FIN));
const above = (a: Access) => !a.readOnly && (a.isAdmin || a.exec || a.heads.includes(FIN));
const reconsiders = (a: Access, e: Doc<"expenses">) =>
  (e.status === "validated" || e.status === "rejected" || e.status === "paid") &&
  (above(a) || (e.status !== "paid" && e.decidedByEmail === a.email && decides(a, e.team)));
const who = (a: Access) => `${a.name || a.email.split("@")[0]} (${a.label})`;
const clip = (s: string, n: number) => s.trim().slice(0, n);

export const list = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return [];
    const rows = await ctx.db.query("expenses").collect();
    const out = [];
    for (const e of rows) {
      if (!seesExpense(a, e)) continue;
      out.push({
        ...e,
        fileUrl: e.fileId ? await ctx.storage.getUrl(e.fileId) : null,
        canDecide: e.status === "requested" && decides(a, e.team),
        canEsade: e.status === "requested" && decides(a, e.team),
        canPay: e.status === "validated" && pays(a),
        canReconsider: reconsiders(a, e),
      });
    }
    return out;
  },
});

export const request = mutation({
  args: {
    team: v.string(),
    dept: v.string(),
    item: v.string(),
    cat: v.string(),
    amount: v.number(),
    link: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    if (!TEAMS.some((t) => t.id === x.team)) throw new ConvexError("Unknown team.");
    if (!DEPARTMENTS.includes(x.dept)) throw new ConvexError("Unknown department.");
    if (!canEdit(a, { team: x.team, dept: x.dept, captains: true }) && !decides(a, x.team))
      throw new ConvexError(a.readOnly ? "Your access is view-only." : "You can only request expenses for your own team or department.");
    const item = clip(x.item, 140);
    if (!item) throw new ConvexError("Say what the expense is for.");
    if (!(x.amount > 0 && x.amount <= 100000)) throw new ConvexError("Enter an amount in euros.");
    const link = x.link?.trim();
    if (link && !/^https:\/\//i.test(link)) throw new ConvexError("The link must start with https://");
    const now = Date.now();
    return await ctx.db.insert("expenses", {
      team: x.team,
      dept: x.dept,
      item,
      cat: clip(x.cat, 40) || "Other",
      amount: Math.round(x.amount * 100) / 100,
      date: new Date(now).toISOString().slice(0, 10),
      status: "requested",
      by: who(a),
      byEmail: a.email,
      link: link ? link.slice(0, 500) : undefined,
      fileId: x.fileId,
      fileName: x.fileName ? clip(x.fileName, 120) : undefined,
      history: [{ action: "requested", by: who(a), at: now }],
      isExample: false,
    });
  },
});

async function load(ctx: MutationCtx, id: Id<"expenses">) {
  const e = await ctx.db.get(id);
  if (!e) throw new ConvexError("This expense no longer exists.");
  return e;
}

export const decide = mutation({
  args: { id: v.id("expenses"), status: v.union(v.literal("validated"), v.literal("rejected"), v.literal("paid")), reason: v.optional(v.string()) },
  handler: async (ctx, { id, status, reason }) => {
    const a = await requireAccess(ctx);
    const e = await load(ctx, id);
    const now = Date.now();
    const why = reason ? clip(reason, 300) : "";
    if (status === "paid") {
      if (e.status !== "validated") throw new ConvexError("Only a validated expense can be marked paid.");
      if (!pays(a)) throw new ConvexError("Only the Head of Finance, the President or a Vice-president marks expenses paid.");
      await ctx.db.patch(id, { status, history: [...e.history, { action: "paid", by: who(a), at: now }] });
      return null;
    }
    if (e.status !== "requested") throw new ConvexError("This request was already decided. Reconsider it first.");
    if (!decides(a, e.team)) throw new ConvexError("Only Finance for this team can decide.");
    if (status === "validated" && e.esade !== "accepted")
      throw new ConvexError("Esade finance has to accept this request before Finance can validate it.");
    if (status === "rejected" && !why) throw new ConvexError("Write why the request is rejected.");
    await ctx.db.patch(id, {
      status,
      decidedBy: who(a),
      decidedByEmail: a.email,
      decidedAt: now,
      reason: status === "rejected" ? why : undefined,
      history: [...e.history, { action: status, by: who(a), at: now, reason: why || undefined }],
    });
    return null;
  },
});

// Esade acceptance: Finance forwards the request (usually with an unpaid invoice) to Esade's finance office,
// then records Esade's answer. Finance can only validate once Esade has accepted.
const ESADE_ACTION = { sent: "esade_sent", accepted: "esade_accepted", refused: "esade_refused" } as const;
export const esadeStep = mutation({
  args: { id: v.id("expenses"), step: v.union(v.literal("sent"), v.literal("accepted"), v.literal("refused")), note: v.optional(v.string()) },
  handler: async (ctx, { id, step, note }) => {
    const a = await requireAccess(ctx);
    const e = await load(ctx, id);
    if (e.status !== "requested") throw new ConvexError("Only an open request goes to Esade. Reconsider it first.");
    if (!decides(a, e.team)) throw new ConvexError("Only Finance for this team records Esade's answer.");
    const why = note ? clip(note, 300) : "";
    if (step === "refused" && !why) throw new ConvexError("Write what Esade said.");
    const now = Date.now();
    await ctx.db.patch(id, {
      esade: step,
      esadeAt: now,
      esadeBy: who(a),
      esadeNote: why || undefined,
      history: [...e.history, { action: ESADE_ACTION[step], by: who(a), at: now, reason: why || undefined }],
    });
    return null;
  },
});

// Puts a decided request back to "requested" so it can be decided again. The reason is kept in the history.
export const reconsider = mutation({
  args: { id: v.id("expenses"), reason: v.string() },
  handler: async (ctx, { id, reason }) => {
    const a = await requireAccess(ctx);
    const e = await load(ctx, id);
    if (!reconsiders(a, e))
      throw new ConvexError("Only the person who decided, the Head of Finance, the President or a Vice-president can reconsider this.");
    const why = clip(reason, 300);
    if (!why) throw new ConvexError("Write why the decision is reconsidered.");
    await ctx.db.patch(id, {
      status: "requested",
      decidedBy: undefined,
      decidedByEmail: undefined,
      decidedAt: undefined,
      reason: undefined,
      history: [...e.history, { action: "reopened", by: who(a), at: Date.now(), reason: why }],
    });
    return null;
  },
});

// Admins only: fill an empty ledger with example rows (marked "Example") for demos, or remove them.
const EXAMPLES: [string, string, string, string, number, string, "requested" | "validated" | "paid" | "rejected"][] = [
  ["football7-men", "Operations", "League registration fee", "League fees", 650, "2026-10-02", "paid"],
  ["football7-men", "Operations", "Match jerseys (14)", "Kit", 880, "2026-10-09", "paid"],
  ["futsal-women", "Operations", "League registration fee", "League fees", 650, "2026-10-03", "paid"],
  ["futsal-women", "Operations", "Referee fees, October", "Facilities", 240, "2026-11-04", "validated"],
  ["basketball-men", "Operations", "Court booking, try-outs", "Facilities", 300, "2026-09-20", "paid"],
  ["basketball-men", "Operations", "Away game travel", "Travel", 420, "2026-11-08", "requested"],
  ["basketball-women", "Operations", "Training balls (10)", "Material", 260, "2026-11-06", "requested"],
  ["basketball-women", "Media & Marketing", "Match-day photographer", "Media", 120, "2026-11-02", "rejected"],
  ["volleyball-men", "Operations", "Tournament entry", "League fees", 500, "2026-10-15", "paid"],
  ["volleyball-women", "Operations", "Tournament entry", "League fees", 500, "2026-10-15", "validated"],
  ["padel-men", "Operations", "Court hire, league night", "Facilities", 360, "2026-11-10", "requested"],
  ["volleyball-mixed", "Operations", "Team shirts", "Kit", 540, "2026-10-28", "paid"],
  ["futsal-men", "Operations", "Futsal balls (10)", "Material", 310, "2026-11-01", "validated"],
  ["padel-women", "Operations", "Padel balls (24)", "Material", 150, "2026-11-09", "requested"],
  ["rugby", "Media & Marketing", "Poster printing, home game", "Media", 180, "2026-11-05", "validated"],
];
export const loadExamples = mutation({
  args: { remove: v.optional(v.boolean()) },
  handler: async (ctx, { remove }) => {
    const a = await requireAccess(ctx);
    if (!a.isAdmin) throw new ConvexError("Admins only.");
    const rows = await ctx.db.query("expenses").collect();
    if (remove) {
      for (const r of rows) if (r.isExample) await ctx.db.delete(r._id);
      return null;
    }
    if (rows.some((r) => r.isExample)) return null;
    for (const [team, dept, item, cat, amount, date, status] of EXAMPLES) {
      const at = Date.parse(date + "T10:00:00Z");
      const decided = status !== "requested";
      const history = [{ action: "requested", by: "Example captain (Captain)", at }];
      const ok = status === "validated" || status === "paid";
      if (ok) history.push({ action: "esade_accepted", by: "Example associate (Associate · Finance)", at: at + 43200000 });
      if (decided) history.push({ action: status === "paid" ? "validated" : status, by: "Example associate (Associate · Finance)", at: at + 86400000 });
      if (status === "paid") history.push({ action: "paid", by: "Example head (Head of Finance)", at: at + 3 * 86400000 });
      await ctx.db.insert("expenses", {
        team, dept, item, cat, amount, date, status,
        by: "Example captain (Captain)",
        byEmail: "example@esade.edu",
        decidedBy: decided ? "Example associate (Associate · Finance)" : undefined,
        decidedAt: decided ? at + 86400000 : undefined,
        reason: status === "rejected" ? "Media covers match days with its own camera this semester." : undefined,
        esade: ok ? "accepted" : undefined,
        esadeAt: ok ? at + 43200000 : undefined,
        esadeBy: ok ? "Example associate (Associate · Finance)" : undefined,
        history,
        isExample: true,
      });
    }
    return null;
  },
});
