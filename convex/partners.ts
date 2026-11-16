import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canEdit, canSee, getAccess, hideMail, requireAccess, type Access } from "./roles";
import { TEAMS } from "./teamList";

// Partnerships tracker: every sponsor or partner from first contact to signed, plus the partner
// inquiries sent from the public website.
//   See: Partnerships (head: all; associates: association-wide partners + their teams'),
//        President, VPs, admins, Student Council (read-only).
//   Add / edit: Partnerships for the partner's team, President, VPs, admins. Remove: the head, President, VPs, admins.
const DEPT = "Partnerships";
export const PARTNER_KINDS = ["Cash sponsor", "Kit / equipment", "In-kind (food, drinks, services)", "Event partner", "Industry Platform", "Other"];
const STAGES = ["lead", "contacted", "meeting", "proposal", "signed", "lost"] as const;
const stageV = v.union(...STAGES.map((s) => v.literal(s)));
const res = (team?: string) => ({ dept: DEPT, team });
const manages = (a: Access) => !a.readOnly && (a.isAdmin || a.exec || a.heads.includes(DEPT));
const who = (a: Access) => `${a.name || a.email.split("@")[0]} (${a.label})`;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a || !canSee(a, { dept: DEPT })) return null;
    const rows = await ctx.db.query("partners").collect();
    const partners = rows
      .filter((p) => canSee(a, res(p.team)))
      .map((p) => ({ ...p, canEdit: canEdit(a, res(p.team)), canRemove: manages(a) }))
      .sort((x, y) => y.updatedAt - x.updatedAt);
    // Inquiries from the website's partner form: department-wide.
    const inquiries = (await ctx.db.query("partnerInquiries").order("desc").collect()).map((i) => ({ ...hideMail(a, i), status: i.status ?? "new" }));
    return { partners, inquiries, kinds: PARTNER_KINDS, canAdd: canEdit(a, { dept: DEPT }), canInquiry: canEdit(a, { dept: DEPT }) };
  },
});

const fields = {
  company: v.string(),
  contactName: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  team: v.optional(v.string()),
  kind: v.string(),
  stage: stageV,
  value: v.optional(v.number()),
  nextStep: v.optional(v.string()),
  nextDate: v.optional(v.string()),
  notes: v.optional(v.string()),
  ownerEmail: v.optional(v.string()),
  ownerName: v.optional(v.string()),
};
function clean(x: { [k: string]: unknown } & { company: string; kind: string }) {
  const s = (k: string, n: number) => (typeof x[k] === "string" ? (x[k] as string).trim().slice(0, n) : "") || undefined;
  const company = x.company.trim().slice(0, 120);
  if (!company) throw new ConvexError("Enter the company name.");
  if (!PARTNER_KINDS.includes(x.kind)) throw new ConvexError("Choose the kind of partnership.");
  const contactEmail = s("contactEmail", 200)?.toLowerCase();
  if (contactEmail && !EMAIL_RE.test(contactEmail)) throw new ConvexError("Check the contact email.");
  const team = typeof x.team === "string" && TEAMS.some((t) => t.id === x.team) ? (x.team as string) : undefined;
  const value = typeof x.value === "number" && Number.isFinite(x.value) && x.value >= 0 ? Math.round(x.value) : undefined;
  const nextDate = /^\d{4}-\d{2}-\d{2}$/.test(String(x.nextDate ?? "")) ? (x.nextDate as string) : undefined;
  return {
    company,
    kind: x.kind,
    team,
    value,
    nextDate,
    contactName: s("contactName", 100),
    contactEmail,
    nextStep: s("nextStep", 200),
    notes: s("notes", 2000),
    ownerEmail: s("ownerEmail", 200)?.toLowerCase(),
    ownerName: s("ownerName", 100),
  };
}

export const add = mutation({
  args: { ...fields, inquiryId: v.optional(v.id("partnerInquiries")) },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    const p = clean(x);
    if (!canEdit(a, res(p.team))) throw new ConvexError("Only Partnerships adds partners.");
    const now = Date.now();
    await ctx.db.insert("partners", { ...p, stage: x.stage, inquiryId: x.inquiryId, by: who(a), at: now, updatedAt: now });
    if (x.inquiryId) await ctx.db.patch(x.inquiryId, { status: "added" });
    return null;
  },
});

export const update = mutation({
  args: { id: v.id("partners"), ...fields },
  handler: async (ctx, { id, ...x }) => {
    const a = await requireAccess(ctx);
    const old = await ctx.db.get(id);
    if (!old) throw new ConvexError("Partner not found.");
    const p = clean(x);
    if (!canEdit(a, res(old.team)) || !canEdit(a, res(p.team))) throw new ConvexError("You can't change this partner.");
    await ctx.db.patch(id, { ...p, stage: x.stage, by: who(a), updatedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("partners") },
  handler: async (ctx, { id }) => {
    const a = await requireAccess(ctx);
    if (!manages(a)) throw new ConvexError("Only the Head of Partnerships removes partners.");
    await ctx.db.delete(id);
    return null;
  },
});

export const setInquiryStatus = mutation({
  args: { id: v.id("partnerInquiries"), status: v.union(v.literal("new"), v.literal("contacted"), v.literal("added"), v.literal("closed")) },
  handler: async (ctx, { id, status }) => {
    const a = await requireAccess(ctx);
    if (!canEdit(a, { dept: DEPT })) throw new ConvexError("Only Partnerships follows up inquiries.");
    await ctx.db.patch(id, { status });
    return null;
  },
});
