import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { canEdit, canSee, DEPARTMENTS, getAccess, requireAccess, type Access } from "./roles";
import { logActivity } from "./activity";
import { TEAMS } from "./teamList";

// Team handover (Hub). For each team and department: notes, contacts, links and files (invoices, league
// documents, jersey supplier...) so the next captain and the newly recruited associates can start from it.
// Who sees a section: the team's captain(s), the head of that department (every team), its associates (their
// teams only), President / VPs / admins, and the view-only account (read-only). Same rule edits it, except view-only.
// Never store passwords here: write who holds the access instead.

const MAX_FILE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 20; // per team and department
const FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const SECRET_RE = /\b(password|passwd|pwd|contraseña|contrasenya|mot de passe)\s*[:=]/i;
const res = (team: string, dept: string) => ({ team, dept, captains: true });
const who = (a: Access) => `${a.name || a.email.split("@")[0]} (${a.label})`;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return null;
    const teams = [];
    for (const t of TEAMS) {
      const depts = DEPARTMENTS.filter((d) => canSee(a, res(t.id, d)));
      if (!depts.length) continue;
      const rows = await ctx.db.query("handover").withIndex("by_team", (q) => q.eq("team", t.id)).collect();
      const sections = [];
      for (const dept of depts) {
        const r = rows.find((x) => x.dept === dept);
        const files = [];
        for (const f of r?.files ?? []) files.push({ ...f, url: await ctx.storage.getUrl(f.id) });
        sections.push({
          dept,
          canEdit: canEdit(a, res(t.id, dept)),
          notes: r?.notes ?? "",
          contacts: r?.contacts ?? [],
          links: r?.links ?? [],
          files,
          updatedBy: r?.updatedBy,
          updatedAt: r?.updatedAt,
        });
      }
      teams.push({ team: t.id, sections });
    }
    return { teams };
  },
});

async function editRow(ctx: MutationCtx, a: Access, team: string, dept: string): Promise<Doc<"handover"> | null> {
  if (!TEAMS.some((t) => t.id === team) || !DEPARTMENTS.includes(dept)) throw new ConvexError("Unknown team or department.");
  if (!canEdit(a, res(team, dept))) throw new ConvexError(a.readOnly ? "Your access is view-only." : "You can't edit this section.");
  const rows = await ctx.db.query("handover").withIndex("by_team", (q) => q.eq("team", team)).collect();
  return rows.find((r) => r.dept === dept) ?? null;
}
const cut = (s: string | undefined, n: number) => s?.trim().slice(0, n) || undefined;

export const save = mutation({
  args: {
    team: v.string(),
    dept: v.string(),
    notes: v.string(),
    contacts: v.array(v.object({ name: v.string(), role: v.optional(v.string()), email: v.optional(v.string()), phone: v.optional(v.string()), org: v.optional(v.string()) })),
    links: v.array(v.object({ label: v.string(), url: v.string() })),
  },
  handler: async (ctx, args) => {
    const a = await requireAccess(ctx);
    const row = await editRow(ctx, a, args.team, args.dept);
    const notes = cut(args.notes, 8000);
    if (notes && SECRET_RE.test(notes)) throw new ConvexError("Please don't write passwords here. Write who holds the access instead.");
    const contacts = args.contacts
      .map((c) => ({ name: c.name.trim().slice(0, 100), role: cut(c.role, 100), email: cut(c.email, 200), phone: cut(c.phone, 40), org: cut(c.org, 100) }))
      .filter((c) => c.name || c.email || c.phone)
      .map((c) => ({ ...c, name: c.name || c.org || c.email || "Contact" }))
      .slice(0, 40);
    const links = [];
    for (const l of args.links.slice(0, 30)) {
      let url = l.url.trim();
      if (!url) continue;
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      try {
        new URL(url);
      } catch {
        throw new ConvexError(`This link is not valid: ${l.url.slice(0, 60)}`);
      }
      links.push({ label: l.label.trim().slice(0, 100) || url.replace(/^https?:\/\//, "").slice(0, 60), url: url.slice(0, 500) });
    }
    const data = { notes, contacts, links, updatedBy: who(a), updatedAt: Date.now() };
    if (row) await ctx.db.patch(row._id, data);
    else await ctx.db.insert("handover", { team: args.team, dept: args.dept, files: [], ...data });
    await logActivity(ctx, a, args.team, "handover", `Handover: updated the ${args.dept} section`);
    return null;
  },
});

export const addFile = mutation({
  args: { team: v.string(), dept: v.string(), storageId: v.id("_storage"), name: v.string() },
  handler: async (ctx, { team, dept, storageId, name }): Promise<{ error: string | null }> => {
    const a = await requireAccess(ctx);
    // A refused file is deleted and the reason returned (not thrown: a throw would also undo the delete).
    const meta = await ctx.db.system.get(storageId);
    if (!meta) return { error: "Upload not found. Try again." };
    const refuse = async (error: string) => {
      await ctx.storage.delete(storageId);
      return { error };
    };
    if (!TEAMS.some((t) => t.id === team) || !DEPARTMENTS.includes(dept) || !canEdit(a, res(team, dept))) return await refuse("You can't add files to this section.");
    if (meta.size > MAX_FILE) return await refuse("The file is too big (max 10 MB).");
    if (!FILE_TYPES.includes(meta.contentType ?? "")) return await refuse("Only PDF, image, Excel, Word or CSV files.");
    const row = await editRow(ctx, a, team, dept);
    if ((row?.files.length ?? 0) >= MAX_FILES) return await refuse(`Max ${MAX_FILES} files per section. Remove one first.`);
    const file = { id: storageId, name: name.trim().slice(0, 120) || "File", type: meta.contentType ?? "", size: meta.size, by: who(a), at: Date.now() };
    if (row) await ctx.db.patch(row._id, { files: [...row.files, file], updatedBy: who(a), updatedAt: Date.now() });
    else await ctx.db.insert("handover", { team, dept, contacts: [], links: [], files: [file], updatedBy: who(a), updatedAt: Date.now() });
    await logActivity(ctx, a, team, "handover", `Handover: added ${file.name} to ${dept}`);
    return { error: null };
  },
});

export const removeFile = mutation({
  args: { team: v.string(), dept: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { team, dept, storageId }) => {
    const a = await requireAccess(ctx);
    const row = await editRow(ctx, a, team, dept);
    if (!row || !row.files.some((f) => f.id === storageId)) return null;
    await ctx.storage.delete(storageId);
    await ctx.db.patch(row._id, { files: row.files.filter((f) => f.id !== storageId), updatedBy: who(a), updatedAt: Date.now() });
    await logActivity(ctx, a, team, "handover", `Handover: removed a file from ${dept}`);
    return null;
  },
});
