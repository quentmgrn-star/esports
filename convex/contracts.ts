import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { canEdit, canSee, DEPARTMENTS, getAccess, requireAccess, type Access } from "./roles";
import { logActivity } from "./activity";
import { TEAMS } from "./teamList";

// Contracts (Hub): signed agreements with their PDFs, e.g. a sponsor deal, a league or venue agreement,
// a jersey supplier. Each contract belongs to one department and either one team or the whole association.
// Who sees one (same rule as the team handover, convex/roles.ts):
//   team contract: that team's captain(s) and vice-captain(s), the head of its department, that department's
//   associates for the team, President / VPs / admins, and the view-only account (read-only).
//   association-wide contract (no team): the head and associates of its department, President / VPs / admins, view-only.
// Other departments do not see it. The same people (except view-only) can add, remove and attach files.

const MAX_FILE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 10; // per contract
const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const who = (a: Access) => `${a.name || a.email.split("@")[0]} (${a.label})`;
const res = (c: { team?: string; dept: string }) => ({ team: c.team, dept: c.dept, captains: !!c.team });
const cut = (s: string | undefined, n: number) => s?.trim().slice(0, n) || undefined;
const day = (s: string | undefined) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);

export const list = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return null;
    const rows = await ctx.db.query("contracts").collect();
    const out = [];
    for (const c of rows) {
      if (!canSee(a, res(c))) continue;
      const files = [];
      for (const f of c.files) files.push({ id: f.id, name: f.name, size: f.size, url: await ctx.storage.getUrl(f.id) });
      out.push({ ...c, files, canEdit: canEdit(a, res(c)) });
    }
    // Where this person may add a contract (the form offers only these). team "" = whole association.
    const options = [{ team: "", depts: DEPARTMENTS.filter((d) => canEdit(a, { dept: d })) }]
      .concat(TEAMS.map((t) => ({ team: t.id, depts: DEPARTMENTS.filter((d) => canEdit(a, res({ team: t.id, dept: d }))) })))
      .filter((o) => o.depts.length);
    return { contracts: out.sort((x, y) => (y.signedOn ?? "").localeCompare(x.signedOn ?? "") || y.at - x.at), options };
  },
});

// Checks one uploaded file. A refused file is deleted from storage and its reason returned.
async function takeFile(ctx: MutationCtx, a: Access, id: Id<"_storage">, name: string) {
  const meta = await ctx.db.system.get(id);
  if (!meta) return { error: `${name}: upload not found` };
  let error = "";
  if (meta.size > MAX_FILE) error = `${name}: too big (max 10 MB)`;
  else if (!TYPES.includes(meta.contentType ?? "")) error = `${name}: only PDF or image files`;
  if (error) {
    await ctx.storage.delete(id);
    return { error };
  }
  return { file: { id, name: name.trim().slice(0, 120) || "File", type: meta.contentType ?? "", size: meta.size, by: who(a), at: Date.now() } };
}

export const add = mutation({
  args: {
    team: v.optional(v.string()), // empty = whole association
    dept: v.string(),
    title: v.string(),
    party: v.optional(v.string()),
    signedOn: v.optional(v.string()),
    endsOn: v.optional(v.string()),
    notes: v.optional(v.string()),
    files: v.array(v.object({ id: v.id("_storage"), name: v.string() })),
  },
  handler: async (ctx, x): Promise<{ skipped: string[] }> => {
    const a = await requireAccess(ctx);
    const team = x.team || undefined;
    if (team && !TEAMS.some((t) => t.id === team)) throw new ConvexError("Unknown team.");
    if (!DEPARTMENTS.includes(x.dept)) throw new ConvexError("Unknown department.");
    if (!canEdit(a, res({ team, dept: x.dept }))) throw new ConvexError(a.readOnly ? "Your access is view-only." : "You can't add a contract for this team or department.");
    const title = cut(x.title, 140);
    if (!title) throw new ConvexError("Give the contract a title.");
    const files = [], skipped = [];
    for (const f of x.files.slice(0, MAX_FILES)) {
      const r = await takeFile(ctx, a, f.id, f.name);
      if (r.file) files.push(r.file);
      else skipped.push(r.error);
    }
    await ctx.db.insert("contracts", {
      team,
      dept: x.dept,
      title,
      party: cut(x.party, 140),
      signedOn: day(x.signedOn),
      endsOn: day(x.endsOn),
      notes: cut(x.notes, 2000),
      files,
      by: who(a),
      byEmail: a.email,
      at: Date.now(),
    });
    if (team) await logActivity(ctx, a, team, "contracts", `Contracts: added ${title}`);
    return { skipped };
  },
});

async function editable(ctx: MutationCtx, a: Access, id: Id<"contracts">): Promise<Doc<"contracts">> {
  const c = await ctx.db.get(id);
  if (!c) throw new ConvexError("This contract was removed.");
  if (!canEdit(a, res(c))) throw new ConvexError(a.readOnly ? "Your access is view-only." : "You can't change this contract.");
  return c;
}

export const addFile = mutation({
  args: { id: v.id("contracts"), storageId: v.id("_storage"), name: v.string() },
  handler: async (ctx, { id, storageId, name }): Promise<{ error: string | null }> => {
    const a = await requireAccess(ctx);
    const c = await ctx.db.get(id);
    if (!c || !canEdit(a, res(c)) || c.files.length >= MAX_FILES) {
      await ctx.storage.delete(storageId);
      return { error: !c ? "This contract was removed." : c.files.length >= MAX_FILES ? `Max ${MAX_FILES} files per contract.` : "You can't change this contract." };
    }
    const r = await takeFile(ctx, a, storageId, name);
    if (!r.file) return { error: r.error };
    await ctx.db.patch(id, { files: [...c.files, r.file] });
    if (c.team) await logActivity(ctx, a, c.team, "contracts", `Contracts: added a file to ${c.title}`);
    return { error: null };
  },
});

export const removeFile = mutation({
  args: { id: v.id("contracts"), storageId: v.id("_storage") },
  handler: async (ctx, { id, storageId }) => {
    const a = await requireAccess(ctx);
    const c = await editable(ctx, a, id);
    if (!c.files.some((f) => f.id === storageId)) return null;
    await ctx.storage.delete(storageId);
    await ctx.db.patch(id, { files: c.files.filter((f) => f.id !== storageId) });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("contracts") },
  handler: async (ctx, { id }) => {
    const a = await requireAccess(ctx);
    const c = await editable(ctx, a, id);
    for (const f of c.files) await ctx.storage.delete(f.id);
    await ctx.db.delete(id);
    if (c.team) await logActivity(ctx, a, c.team, "contracts", `Contracts: removed ${c.title}`);
    return null;
  },
});
