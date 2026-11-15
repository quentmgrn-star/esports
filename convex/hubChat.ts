import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { DEPARTMENTS, canSee, getAccess, requireAccess, type Access } from "./roles";
import { adminEmails } from "./auth";

// Hub chat for the association (Board + associates; captains and viewers have none):
//   "board"          the Board (president, VPs, heads) and admins
//   "dept:<Dept>"    that department's head and associates, plus president / VPs / admins
//   "dm:<a>|<b>"     direct messages between any two association members
// Group chats share their messages with the chat in /admin (same channel ids, same table).

const member = (a: Access) => a.board || a.assoc.length > 0;
const dmId = (x: string, y: string) => "dm:" + [x.toLowerCase(), y.toLowerCase()].sort().join("|");
const groups = (a: Access) => [
  ...(a.board ? [{ id: "board", label: "Board" }] : []),
  ...DEPARTMENTS.filter((d) => canSee(a, { dept: d })).map((d) => ({ id: `dept:${d}`, label: d })),
];

type Person = { email: string; name: string; role: string };
// Everyone in the association: approved Board members and associates, plus the admins.
async function people(ctx: QueryCtx | MutationCtx): Promise<Person[]> {
  const rows = await ctx.db.query("members").withIndex("by_status", (q) => q.eq("status", "approved")).collect();
  const out = new Map<string, Person>();
  for (const m of rows) {
    if (m.role !== "board" && m.role !== "associate") continue;
    const role =
      m.role === "associate"
        ? `${m.department ?? ""} associate`.trim()
        : m.position === "president"
          ? "President"
          : m.position === "vice-president"
            ? "Vice-president"
            : `Head of ${m.department ?? ""}`.trim();
    const prev = out.get(m.email);
    out.set(m.email, { email: m.email, name: m.name, role: prev ? `${prev.role}, ${role}` : role });
  }
  for (const e of adminEmails()) {
    const p = out.get(e);
    out.set(e, p ? { ...p, role: `Admin, ${p.role}` } : { email: e, name: e, role: "Admin" });
  }
  return [...out.values()];
}

async function canUse(ctx: QueryCtx | MutationCtx, a: Access, channel: string): Promise<boolean> {
  if (!member(a)) return false;
  if (channel.startsWith("dm:")) {
    const pair = channel.slice(3).split("|");
    if (pair.length !== 2 || !pair.includes(a.email) || pair[0] === pair[1]) return false;
    const other = pair[0] === a.email ? pair[1] : pair[0];
    return (await people(ctx)).some((p) => p.email === other);
  }
  return groups(a).some((g) => g.id === channel);
}

async function summary(ctx: QueryCtx, email: string, channel: string) {
  const last = await ctx.db.query("chatMessages").withIndex("by_channel", (q) => q.eq("channel", channel)).order("desc").first();
  if (!last) return { lastAt: 0, lastText: "", lastBy: "", unread: 0 };
  const read = await ctx.db.query("chatReads").withIndex("by_email_channel", (q) => q.eq("email", email).eq("channel", channel)).unique();
  const since = read?.at ?? 0;
  const fresh = await ctx.db
    .query("chatMessages")
    .withIndex("by_channel", (q) => q.eq("channel", channel).gt("_creationTime", since))
    .take(100);
  return { lastAt: last._creationTime, lastText: last.body.slice(0, 80), lastBy: last.authorName, unread: fresh.filter((m) => m.authorEmail !== email).length };
}

// The chat list: group chats this account may open, and one entry per association member for direct messages.
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a || !member(a)) return null;
    const gs = await Promise.all(groups(a).map(async (g) => ({ ...g, ...(await summary(ctx, a.email, g.id)) })));
    const ppl = (await people(ctx)).filter((p) => p.email !== a.email);
    const dms = await Promise.all(ppl.map(async (p) => ({ id: dmId(a.email, p.email), ...p, ...(await summary(ctx, a.email, dmId(a.email, p.email))) })));
    return { me: a.email, groups: gs, dms };
  },
});

export const messages = query({
  args: { channel: v.string() },
  handler: async (ctx, { channel }) => {
    const a = await getAccess(ctx);
    if (!a || !(await canUse(ctx, a, channel))) return null;
    const rows = await ctx.db.query("chatMessages").withIndex("by_channel", (q) => q.eq("channel", channel)).order("desc").take(200);
    return rows.reverse().map((m) => ({ id: m._id, at: m._creationTime, name: m.authorName, role: m.authorRole, body: m.body, mine: m.authorEmail === a.email }));
  },
});

export const send = mutation({
  args: { channel: v.string(), body: v.string() },
  handler: async (ctx, { channel, body }) => {
    const a = await requireAccess(ctx);
    if (!(await canUse(ctx, a, channel))) throw new ConvexError("You don't have access to this chat.");
    const text = body.trim().slice(0, 2000);
    if (!text) throw new ConvexError("Write a message first.");
    await ctx.db.insert("chatMessages", { channel, authorEmail: a.email, authorName: a.name || a.email, authorRole: a.label, body: text });
    await markReadFor(ctx, a.email, channel);
  },
});

async function markReadFor(ctx: MutationCtx, email: string, channel: string) {
  const row = await ctx.db.query("chatReads").withIndex("by_email_channel", (q) => q.eq("email", email).eq("channel", channel)).unique();
  if (row) await ctx.db.patch(row._id, { at: Date.now() });
  else await ctx.db.insert("chatReads", { email, channel, at: Date.now() });
}

export const markRead = mutation({
  args: { channel: v.string() },
  handler: async (ctx, { channel }) => {
    const a = await getAccess(ctx);
    if (!a || !(await canUse(ctx, a, channel))) return;
    await markReadFor(ctx, a.email, channel);
  },
});
