import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { DEPARTMENTS, canEdit, canSee, getAccess, requireAccess, type Access } from "./roles";
import { TEAMS } from "./teamList";

// Shared department tasks: everyone in the department sees the same list (no more per-browser copies).
//   See: the department (head: all tasks; associates: department-wide tasks + their teams' tasks),
//        President, VPs, admins, Student Council (read-only). "Board" tasks: the Board only.
//   Add / remove: the department's head, President, VPs, admins.
//   Change the status: anyone in the department who sees the task (not view-only).
const BOARD = "Board";
const res = (dept: string, team?: string) => ({ dept, team });
const sees = (a: Access, dept: string, team?: string) => (dept === BOARD ? a.board || a.full : canSee(a, res(dept, team)));
const edits = (a: Access, dept: string, team?: string) => (dept === BOARD ? !a.readOnly && (a.isAdmin || a.exec) : canEdit(a, res(dept, team)));
const manages = (a: Access, dept: string) => !a.readOnly && (a.isAdmin || a.exec || (dept !== BOARD && a.heads.includes(dept)));
const statusV = v.union(v.literal("todo"), v.literal("doing"), v.literal("done"));
const who = (a: Access) => `${a.name || a.email.split("@")[0]} (${a.label})`;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return [];
    const rows = await ctx.db.query("tasks").collect();
    return rows
      .filter((t) => sees(a, t.dept, t.team))
      .map((t) => ({ ...t, canSet: edits(a, t.dept, t.team), canRemove: manages(a, t.dept), mine: t.ownerEmail === a.email }))
      .sort((x, y) => x.at - y.at);
  },
});

export const add = mutation({
  args: { dept: v.string(), title: v.string(), team: v.optional(v.string()), ownerEmail: v.optional(v.string()), ownerName: v.optional(v.string()), due: v.optional(v.string()) },
  handler: async (ctx, x) => {
    const a = await requireAccess(ctx);
    if (x.dept !== BOARD && !DEPARTMENTS.includes(x.dept)) throw new ConvexError("Unknown department.");
    if (!manages(a, x.dept)) throw new ConvexError("Only the head of the department (or the President / VPs) adds tasks.");
    const title = x.title.trim().slice(0, 120);
    if (!title) throw new ConvexError("Give the task a title.");
    const team = x.team && TEAMS.some((t) => t.id === x.team) ? x.team : undefined;
    await ctx.db.insert("tasks", {
      dept: x.dept,
      title,
      team,
      ownerEmail: x.ownerEmail?.trim().toLowerCase().slice(0, 200) || undefined,
      ownerName: x.ownerName?.trim().slice(0, 100) || undefined,
      status: "todo",
      due: /^\d{4}-\d{2}-\d{2}$/.test(x.due ?? "") ? x.due : undefined,
      by: who(a),
      at: Date.now(),
    });
    return null;
  },
});

export const setStatus = mutation({
  args: { id: v.id("tasks"), status: statusV },
  handler: async (ctx, { id, status }) => {
    const a = await requireAccess(ctx);
    const t = await ctx.db.get(id);
    if (!t) throw new ConvexError("Task not found.");
    if (!edits(a, t.dept, t.team)) throw new ConvexError("You can't change this task.");
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const a = await requireAccess(ctx);
    const t = await ctx.db.get(id);
    if (!t) return null;
    if (!manages(a, t.dept)) throw new ConvexError("Only the head of the department removes tasks.");
    await ctx.db.delete(id);
    return null;
  },
});
