import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAccess, requireAccess, type Access } from "./roles";
import { TEAMS } from "./teamList";

// Team rosters hold personal data (ID numbers, birth dates, phones, allergies).
// Read and edit: the team's own captain(s), admins, the President and the Vice-presidents.
// Not heads, not associates, not the read-only Student Council view, and never the public site.
const allowed = (a: Access, team: string) => !a.readOnly && (a.isAdmin || a.exec || a.teams.includes(team));
const board = (a: Access) => !a.readOnly && (a.isAdmin || a.exec);

export const get = query({
  args: { team: v.string() },
  handler: async (ctx, { team }) => {
    const a = await getAccess(ctx);
    if (!a || !allowed(a, team)) return null;
    return await ctx.db.query("rosters").withIndex("by_team", (q) => q.eq("team", team)).unique();
  },
});

// Board overview: every team's roster (admins, President, VPs only).
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a || !board(a)) return [];
    return await ctx.db.query("rosters").collect();
  },
});

const s = v.optional(v.string());
export const save = mutation({
  args: {
    team: v.string(),
    players: v.array(
      v.object({ first: v.string(), last: v.string(), shirt: s, number: s, idDoc: s, nationality: s, birth: s, email: s, phone: s, program: s, year: s, notes: s }),
    ),
  },
  handler: async (ctx, { team, players }) => {
    const a = await requireAccess(ctx);
    if (!TEAMS.some((t) => t.id === team)) throw new ConvexError("Unknown team.");
    if (!allowed(a, team)) throw new ConvexError("Only the team's captain and the President / Vice-presidents can edit the roster.");
    if (players.length > 60) throw new ConvexError("Too many players (max 60).");
    const clip = (x: string | undefined, n: number) => (x ? x.trim().slice(0, n) || undefined : undefined);
    const clean = players
      .map((p) => ({
        first: p.first.trim().slice(0, 60),
        last: p.last.trim().slice(0, 60),
        shirt: clip(p.shirt, 6),
        number: clip(p.number, 4),
        idDoc: clip(p.idDoc, 20),
        nationality: clip(p.nationality, 40),
        birth: clip(p.birth, 10),
        email: clip(p.email, 120),
        phone: clip(p.phone, 30),
        program: clip(p.program, 30),
        year: clip(p.year, 12),
        notes: clip(p.notes, 200),
      }))
      .filter((p) => p.first || p.last);
    const row = await ctx.db.query("rosters").withIndex("by_team", (q) => q.eq("team", team)).unique();
    const data = { team, players: clean, updatedBy: `${a.name || a.email.split("@")[0]} (${a.label})`, updatedAt: Date.now() };
    if (row) await ctx.db.patch(row._id, data);
    else await ctx.db.insert("rosters", data);
    return null;
  },
});
