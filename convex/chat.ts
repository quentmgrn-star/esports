import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { DEPARTMENTS, requireAccess, getAccess, sportsOf, type Access } from "./roles";
import { TEAMS } from "./teamList";

// Channels: General (everyone with an account), Board (admin + Board), one per department
// (its associates + Board + admin) and one per sport (its captains + Board + admin).
const SPORTS = [...new Set(TEAMS.map((t) => t.sport))];
type Channel = { id: string; label: string; kind: "general" | "board" | "dept" | "sport" };
const ALL: Channel[] = [
  { id: "general", label: "General", kind: "general" },
  { id: "board", label: "Board", kind: "board" },
  ...DEPARTMENTS.map((d) => ({ id: `dept:${d}`, label: d, kind: "dept" as const })),
  ...SPORTS.map((s) => ({ id: `sport:${s}`, label: s, kind: "sport" as const })),
];

function canRead(a: Access, c: Channel): boolean {
  if (a.seesAll) return true; // admin and Board see every channel
  if (c.kind === "general") return true;
  if (c.kind === "dept") return a.associate.includes(c.id.slice(5));
  if (c.kind === "sport") return sportsOf(a.teams).has(c.id.slice(6));
  return false;
}
function channel(a: Access, id: string): Channel {
  const c = ALL.find((x) => x.id === id);
  if (!c || !canRead(a, c)) throw new ConvexError("You don't have access to this channel.");
  return c;
}

export const channels = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return null;
    const mine = ALL.filter((c) => canRead(a, c));
    return Promise.all(
      mine.map(async (c) => {
        const last = await ctx.db.query("chatMessages").withIndex("by_channel", (q) => q.eq("channel", c.id)).order("desc").first();
        return { ...c, lastAt: last?._creationTime ?? 0 };
      }),
    );
  },
});

export const list = query({
  args: { channel: v.string() },
  handler: async (ctx, args) => {
    const a = await getAccess(ctx);
    if (!a) return null;
    channel(a, args.channel);
    const rows = await ctx.db.query("chatMessages").withIndex("by_channel", (q) => q.eq("channel", args.channel)).order("desc").take(200);
    return rows.reverse().map((m) => ({ ...m, mine: m.authorEmail === a.email, canDelete: m.authorEmail === a.email || a.seesAll }));
  },
});

export const send = mutation({
  args: { channel: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const a = await requireAccess(ctx);
    channel(a, args.channel);
    const body = args.body.trim().slice(0, 2000);
    if (!body) throw new ConvexError("Write a message first.");
    await ctx.db.insert("chatMessages", { channel: args.channel, authorEmail: a.email, authorName: a.name || a.email, authorRole: a.label, body });
  },
});

export const edit = mutation({
  args: { id: v.id("chatMessages"), body: v.string() },
  handler: async (ctx, { id, body }) => {
    const a = await requireAccess(ctx);
    const m = await ctx.db.get(id);
    if (!m || m.authorEmail !== a.email) throw new ConvexError("You can only edit your own messages.");
    const text = body.trim().slice(0, 2000);
    if (!text) throw new ConvexError("A message can't be empty.");
    await ctx.db.patch(id, { body: text, editedAt: Date.now() });
  },
});

// Own messages; admin and Board can also remove any message (moderation).
export const remove = mutation({
  args: { id: v.id("chatMessages") },
  handler: async (ctx, { id }) => {
    const a = await requireAccess(ctx);
    const m = await ctx.db.get(id);
    if (!m) return;
    if (m.authorEmail !== a.email && !a.seesAll) throw new ConvexError("Not authorised.");
    channel(a, m.channel);
    await ctx.db.delete(id);
  },
});
