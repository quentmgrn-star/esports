import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { DEPARTMENTS, canEdit, canSee, getAccess, requireAccess, type Access } from "./roles";

// Work summaries and comments on a department's tasks (text, a link, an image or PDF).
// Seen by everyone in that department (its head and associates), the President, VPs, admins and the
// Student Council; written by the department's members, the President, VPs and admins.
// Board tasks ("Board"): the Board only.
const BOARD = "Board";
const sees = (a: Access, dept: string) => (dept === BOARD ? a.board || a.full : canSee(a, { dept }));
const writes = (a: Access, dept: string) => (dept === BOARD ? !a.readOnly && (a.isAdmin || a.exec) : canEdit(a, { dept }));

export const list = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return [];
    const rows = await ctx.db.query("taskUpdates").collect();
    const out = [];
    for (const r of rows) {
      if (!sees(a, r.dept)) continue;
      out.push({ ...r, fileUrl: r.fileId ? await ctx.storage.getUrl(r.fileId) : null, canPost: writes(a, r.dept) });
    }
    return out.sort((x, y) => x.at - y.at);
  },
});

export const add = mutation({
  args: {
    taskKey: v.string(),
    dept: v.string(),
    kind: v.union(v.literal("summary"), v.literal("comment")),
    text: v.string(),
    link: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileType: v.optional(v.string()),
  },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    if (x.dept !== BOARD && !DEPARTMENTS.includes(x.dept)) throw new ConvexError("Unknown department.");
    if (!writes(a, x.dept)) throw new ConvexError(a.readOnly ? "Your access is view-only." : "Only members of this department can post here.");
    const text = x.text.trim().slice(0, 2000);
    if (!text && !x.link && !x.fileId) throw new ConvexError("Write something, or add a link or a file.");
    const link = x.link?.trim();
    if (link && !/^https:\/\//i.test(link)) throw new ConvexError("The link must start with https://");
    await ctx.db.insert("taskUpdates", {
      taskKey: x.taskKey.slice(0, 40),
      dept: x.dept,
      kind: x.kind,
      text,
      link: link?.slice(0, 500),
      fileId: x.fileId,
      fileName: x.fileName?.slice(0, 120),
      fileType: x.fileType?.slice(0, 60),
      by: `${a.name || a.email.split("@")[0]} (${a.label})`,
      byEmail: a.email,
      at: Date.now(),
    });
    return null;
  },
});
