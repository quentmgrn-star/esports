import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { DEPARTMENTS, canSee, getAccess, requireAccess, type Access } from "./roles";

// Main links shown on the Hub overview, per department (e.g. IT: how to change the website;
// Operations: court booking sites, league pages). Seen by the department (head + associates), the President,
// VPs, admins and the Student Council. Added or removed by the department's head, the President, VPs and admins.
const edits = (a: Access, dept: string) => !a.readOnly && (a.isAdmin || a.exec || a.heads.includes(dept));

export const list = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return [];
    const rows = await ctx.db.query("deptLinks").collect();
    return rows
      .filter((r) => canSee(a, { dept: r.dept }))
      .map((r) => ({ ...r, canEdit: edits(a, r.dept) }))
      .sort((x, y) => x.at - y.at);
  },
});

export const add = mutation({
  args: { dept: v.string(), title: v.string(), url: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    if (!DEPARTMENTS.includes(x.dept)) throw new ConvexError("Unknown department.");
    if (!edits(a, x.dept)) throw new ConvexError("Only the head of the department adds links here.");
    const title = x.title.trim().slice(0, 80);
    const url = x.url.trim().slice(0, 500);
    if (!title) throw new ConvexError("Give the link a name.");
    if (!/^https:\/\//i.test(url)) throw new ConvexError("The link must start with https://");
    await ctx.db.insert("deptLinks", {
      dept: x.dept,
      title,
      url,
      note: x.note?.trim().slice(0, 200) || undefined,
      by: `${a.name || a.email.split("@")[0]} (${a.label})`,
      at: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("deptLinks") },
  handler: async (ctx, { id }) => {
    const a = await requireAccess(ctx);
    const r = await ctx.db.get(id);
    if (!r) return null;
    if (!edits(a, r.dept)) throw new ConvexError("Only the head of the department removes links here.");
    await ctx.db.delete(id);
    return null;
  },
});
