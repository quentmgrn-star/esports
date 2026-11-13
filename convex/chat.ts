import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { DEPARTMENTS, canSee, requireAccess, getAccess, type Access } from "./roles";
import { sportOfTeam } from "./teamList";
import { TEAMS } from "./teamList";

// Channels: General (everyone with an account), Board (admin, president, VPs, heads; viewers read),
// one per department (people who see that department) and one per sport (its captains, the heads,
// associates assigned to a team of that sport, and full access).
const SPORTS = [...new Set(TEAMS.map((t) => t.sport))];
type Channel = { id: string; label: string; kind: "general" | "board" | "dept" | "sport" };
const ALL: Channel[] = [
  { id: "general", label: "General", kind: "general" },
  { id: "board", label: "Board", kind: "board" },
  ...DEPARTMENTS.map((d) => ({ id: `dept:${d}`, label: d, kind: "dept" as const })),
  ...SPORTS.map((s) => ({ id: `sport:${s}`, label: s, kind: "sport" as const })),
];

// Who reads a channel follows the same rules as the data (convex/roles.ts).
function canRead(a: Access, c: Channel): boolean {
  if (c.kind === "general") return true;
  if (c.kind === "board") return a.board || a.full;
  if (c.kind === "dept") return canSee(a, { dept: c.id.slice(5) });
  const sport = c.id.slice(6);
  return canSee(a, { sport, captains: true }) || a.heads.length > 0 || a.assoc.some((x) => x.teams.some((t) => sportOfTeam(t) === sport));
}
// The Board (admin, president, VPs, heads) can remove any message in channels they read.
const moderates = (a: Access) => a.board && !a.readOnly;
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
    return rows.reverse().map((m) => ({ ...m, mine: m.authorEmail === a.email, canDelete: !a.readOnly && (m.authorEmail === a.email || moderates(a)), canPost: !a.readOnly }));
  },
});

export const send = mutation({
  args: { channel: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const a = await requireAccess(ctx);
    if (a.readOnly) throw new ConvexError("Your access is view-only.");
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
    if (!m || m.authorEmail !== a.email || a.readOnly) throw new ConvexError("You can only edit your own messages.");
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
    if (a.readOnly || (m.authorEmail !== a.email && !moderates(a))) throw new ConvexError("Not authorised.");
    channel(a, m.channel);
    await ctx.db.delete(id);
  },
});
