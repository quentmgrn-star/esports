import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canEdit, canSee, getAccess, requireAccess, type Access } from "./roles";
import { logActivity } from "./activity";
import { TEAMS } from "./teamList";

// Photo & video history of each team (Hub > History): an archive of past games, choreos, events, and
// content for Media & Marketing. Photos are stored in Convex; videos are links (Drive, YouTube, Instagram...)
// so big files stay where they already are.
// Who sees and adds: the team's captain(s) and vice-captain(s), Media & Marketing (head: every team;
// associates: their teams), President / VPs / admins; the view-only account sees but can't add.
// Anyone who can add can also remove an item.

const MKT = "Media & Marketing";
const MAX_PHOTO = 10 * 1024 * 1024; // 10 MB (the Hub shrinks big photos before upload)
const MAX_PER_TEAM = 1500;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"];
const res = (team: string) => ({ team, dept: MKT, captains: true });
const who = (a: Access) => `${a.name || a.email.split("@")[0]} (${a.label})`;
const cut = (s: string | undefined, n: number) => s?.trim().slice(0, n) || undefined;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a) return null;
    const teams = [];
    for (const t of TEAMS) {
      if (!canSee(a, res(t.id))) continue;
      const rows = await ctx.db.query("teamMedia").withIndex("by_team", (q) => q.eq("team", t.id)).collect();
      const items = [];
      for (const m of rows) items.push({ ...m, src: m.fileId ? await ctx.storage.getUrl(m.fileId) : null });
      teams.push({ team: t.id, canAdd: canEdit(a, res(t.id)), items });
    }
    return teams;
  },
});

export const add = mutation({
  args: {
    team: v.string(),
    season: v.string(),
    event: v.string(),
    caption: v.optional(v.string()),
    photos: v.array(v.object({ id: v.id("_storage"), name: v.string() })),
    videoUrl: v.optional(v.string()),
  },
  handler: async (ctx, x): Promise<{ added: number; skipped: string[] }> => {
    const a = await requireAccess(ctx);
    const ok = TEAMS.some((t) => t.id === x.team) && canEdit(a, res(x.team));
    const skipped: string[] = [];
    if (!ok) throw new ConvexError(a.readOnly ? "Your access is view-only." : "You can only add photos for your own team.");
    const season = cut(x.season, 20);
    const event = cut(x.event, 100);
    if (!season || !event) throw new ConvexError("Say which season and which event (e.g. 2025-26, Spring showcase).");
    let video = x.videoUrl?.trim();
    if (video) {
      if (!/^https?:\/\//i.test(video)) video = "https://" + video;
      try {
        new URL(video);
      } catch {
        throw new ConvexError("The video link is not valid.");
      }
    }
    if (!x.photos.length && !video) throw new ConvexError("Add at least one photo or a video link.");
    const count = (await ctx.db.query("teamMedia").withIndex("by_team", (q) => q.eq("team", x.team)).collect()).length;
    let room = MAX_PER_TEAM - count;
    const base = { team: x.team, season, event, caption: cut(x.caption, 300), by: who(a), byEmail: a.email, at: Date.now() };
    let added = 0;
    for (const p of x.photos.slice(0, 40)) {
      const meta = await ctx.db.system.get(p.id);
      // A refused photo is deleted from storage straight away (nothing else points to it).
      const why = !meta ? "upload not found" : room <= 0 ? "the team's archive is full" : meta.size > MAX_PHOTO ? "too big (max 10 MB)" : !TYPES.includes(meta.contentType ?? "") ? "not a photo" : "";
      if (why) {
        if (meta) await ctx.storage.delete(p.id);
        skipped.push(`${p.name}: ${why}`);
        continue;
      }
      await ctx.db.insert("teamMedia", { ...base, kind: "photo", fileId: p.id, name: p.name.slice(0, 120) });
      room--;
      added++;
    }
    if (video && room > 0) {
      await ctx.db.insert("teamMedia", { ...base, kind: "video", url: video.slice(0, 500) });
      added++;
    }
    if (added) await logActivity(ctx, a, x.team, "media", `History: added ${added} photo${added === 1 ? "" : "s"}/video${added === 1 ? "" : "s"} (${event}, ${season})`);
    return { added, skipped };
  },
});

export const remove = mutation({
  args: { id: v.id("teamMedia") },
  handler: async (ctx, { id }) => {
    const a = await requireAccess(ctx);
    const m = await ctx.db.get(id);
    if (!m) return null;
    if (!canEdit(a, res(m.team))) throw new ConvexError("You can't remove this item.");
    if (m.fileId) await ctx.storage.delete(m.fileId);
    await ctx.db.delete(id);
    return null;
  },
});
