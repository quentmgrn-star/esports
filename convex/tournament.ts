import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getAccess, isExecEditor, requireAccess, type Access } from "./roles";
import { logActivity } from "./activity";
import { TEAMS } from "./teamList";

// Tournament tab (Hub). Captains mark each roster player Attending / Not attending and add the ID or passport
// number and documents. Eva Morta (read-only viewer), the Board and admins see every team; captains only their own.
// Personal data: never public, never in git.

// Used until an admin saves the tournament details in the Hub.
const DEFAULT_EVENT = { name: "UNIJESS - Sevilla", date: "2027-01-29" };
const MAX_FILE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 8; // per player
const FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const seesAll = (a: Access) => a.full || a.board; // admins, President, VPs, heads, read-only viewer (Eva Morta)
const canEditTeam = (a: Access, team: string) => !a.readOnly && (a.isAdmin || a.exec || a.teams.includes(team));
const who = (a: Access) => `${a.name || a.email.split("@")[0]} (${a.label})`;
const keyOf = (first: string, last: string) => `${first} ${last}`.trim().replace(/\s+/g, " ").toLowerCase();

async function rosterPlayers(ctx: QueryCtx | MutationCtx, team: string) {
  const r = await ctx.db.query("rosters").withIndex("by_team", (q) => q.eq("team", team)).unique();
  return r?.players ?? [];
}

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return null;
    const ev = await ctx.db.query("tournaments").first();
    const event = ev
      ? { name: ev.name, date: ev.date, place: ev.place, deadline: ev.deadline, updatedBy: ev.updatedBy, updatedAt: ev.updatedAt }
      : { ...DEFAULT_EVENT, place: undefined, deadline: undefined, updatedBy: undefined, updatedAt: undefined };
    const ids = seesAll(a) ? TEAMS.map((t) => t.id) : TEAMS.map((t) => t.id).filter((id) => a.teams.includes(id));
    const teams = [];
    for (const team of ids) {
      const roster = await rosterPlayers(ctx, team);
      const rows = await ctx.db.query("tournamentPlayers").withIndex("by_team", (q) => q.eq("team", team)).collect();
      const byKey = new Map(rows.map((r) => [r.key, r]));
      const players = [];
      for (const p of roster) {
        const key = keyOf(p.first, p.last);
        const r = byKey.get(key);
        const files = [];
        for (const f of r?.files ?? []) files.push({ id: f.id, name: f.name, type: f.type, size: f.size, by: f.by, at: f.at, url: await ctx.storage.getUrl(f.id) });
        players.push({
          key,
          first: p.first,
          last: p.last,
          number: p.number,
          birth: p.birth,
          nationality: p.nationality,
          rosterId: p.idDoc,
          status: r?.status ?? null,
          idNumber: r?.idNumber,
          files,
          history: (r?.history ?? []).slice(-5),
          updatedBy: r?.updatedBy,
          updatedAt: r?.updatedAt,
        });
      }
      teams.push({ team, canEdit: canEditTeam(a, team), players });
    }
    return { event, canEditEvent: isExecEditor(a), teams };
  },
});

// Finds (or creates) the player's tournament row, after checking the player is on the team's roster.
async function playerRow(ctx: MutationCtx, a: Access, team: string, key: string): Promise<Doc<"tournamentPlayers">> {
  if (!TEAMS.some((t) => t.id === team)) throw new ConvexError("Unknown team.");
  if (!canEditTeam(a, team)) throw new ConvexError("Only the team's captain (and the President / VPs / admins) can change this.");
  const p = (await rosterPlayers(ctx, team)).find((x) => keyOf(x.first, x.last) === key);
  if (!p) throw new ConvexError("This player is not on the team roster any more.");
  const rows = await ctx.db.query("tournamentPlayers").withIndex("by_team", (q) => q.eq("team", team)).collect();
  const row = rows.find((r) => r.key === key);
  if (row) return row;
  const id = await ctx.db.insert("tournamentPlayers", {
    team,
    key,
    name: `${p.first} ${p.last}`.trim(),
    files: [],
    history: [],
    updatedBy: who(a),
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(id))!;
}
async function touch(ctx: MutationCtx, a: Access, row: Doc<"tournamentPlayers">, what: string, patch: Partial<Doc<"tournamentPlayers">>) {
  const at = Date.now();
  await ctx.db.patch(row._id, { ...patch, updatedBy: who(a), updatedAt: at, history: [...row.history, { at, by: who(a), what }].slice(-30) });
}

export const setStatus = mutation({
  args: { team: v.string(), key: v.string(), status: v.union(v.literal("yes"), v.literal("no"), v.literal("none")) },
  handler: async (ctx, { team, key, status }) => {
    const a = await requireAccess(ctx);
    const row = await playerRow(ctx, a, team, key);
    const label = status === "yes" ? "Attending" : status === "no" ? "Not attending" : "Not answered";
    await touch(ctx, a, row, `Marked ${label}`, { status: status === "none" ? undefined : status });
    await logActivity(ctx, a, team, "tournament", `Tournament: ${row.name} marked ${label}`);
    return null;
  },
});

export const setIdNumber = mutation({
  args: { team: v.string(), key: v.string(), idNumber: v.string() },
  handler: async (ctx, { team, key, idNumber }) => {
    const a = await requireAccess(ctx);
    const row = await playerRow(ctx, a, team, key);
    const clean = idNumber.trim().slice(0, 30) || undefined;
    await touch(ctx, a, row, clean ? "Changed the ID / passport number" : "Removed the ID / passport number", { idNumber: clean });
    await logActivity(ctx, a, team, "tournament", `Tournament: ID / passport number ${clean ? "added" : "removed"} for ${row.name}`);
    return null;
  },
});

export const addFile = mutation({
  args: { team: v.string(), key: v.string(), storageId: v.id("_storage"), name: v.string() },
  handler: async (ctx, { team, key, storageId, name }): Promise<{ error: string | null }> => {
    const a = await requireAccess(ctx);
    // A refused file is deleted and the reason returned (not thrown: a throw would also undo the delete).
    const meta = await ctx.db.system.get(storageId);
    if (!meta) return { error: "Upload not found. Try again." };
    const refuse = async (error: string) => {
      await ctx.storage.delete(storageId);
      return { error };
    };
    if (!TEAMS.some((t) => t.id === team) || !canEditTeam(a, team)) return await refuse("Only the team's captain (and the President / VPs / admins) can add documents.");
    if (meta.size > MAX_FILE) return await refuse("The file is too big (max 10 MB).");
    if (!FILE_TYPES.includes(meta.contentType ?? "")) return await refuse("Only PDF or image files (JPG, PNG, WEBP, HEIC).");
    const row = await playerRow(ctx, a, team, key);
    if (row.files.length >= MAX_FILES) return await refuse(`Max ${MAX_FILES} documents per player. Remove one first.`);
    const file = { id: storageId, name: name.trim().slice(0, 120) || "Document", type: meta.contentType ?? "", size: meta.size, by: who(a), at: Date.now() };
    await touch(ctx, a, row, `Added ${file.name}`, { files: [...row.files, file] });
    await logActivity(ctx, a, team, "tournament", `Tournament: document added for ${row.name}`);
    return { error: null };
  },
});

export const removeFile = mutation({
  args: { team: v.string(), key: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { team, key, storageId }) => {
    const a = await requireAccess(ctx);
    const row = await playerRow(ctx, a, team, key);
    const f = row.files.find((x) => x.id === storageId);
    if (!f) return null;
    await ctx.storage.delete(storageId);
    await touch(ctx, a, row, `Removed ${f.name}`, { files: row.files.filter((x) => x.id !== storageId) });
    await logActivity(ctx, a, team, "tournament", `Tournament: document removed for ${row.name}`);
    return null;
  },
});

// Tournament name, date, place and answer deadline: admins, President and VPs.
export const setEvent = mutation({
  args: { name: v.string(), date: v.string(), place: v.optional(v.string()), deadline: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const a = await requireAccess(ctx);
    if (!isExecEditor(a)) throw new ConvexError("Only admins, the President and the Vice-presidents can change the tournament details.");
    const day = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined);
    const date = day(args.date);
    if (!date) throw new ConvexError("Pick the tournament date.");
    const data = {
      name: args.name.trim().slice(0, 80) || DEFAULT_EVENT.name,
      date,
      place: args.place?.trim().slice(0, 120) || undefined,
      deadline: day(args.deadline),
      updatedBy: who(a),
      updatedAt: Date.now(),
    };
    const row = await ctx.db.query("tournaments").first();
    if (row) await ctx.db.replace(row._id, data);
    else await ctx.db.insert("tournaments", data);
    return null;
  },
});
