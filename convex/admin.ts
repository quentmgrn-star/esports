import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { authComponent, isAdminEmail } from "./auth";
import { stageValidator } from "./stages";

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user || !isAdminEmail(user.email)) throw new ConvexError("Not authorised.");
  return user;
}

// Who is signed in, and whether their email is on the ADMIN_EMAILS list.
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    return { name: user.name, email: user.email, isAdmin: isAdminEmail(user.email) };
  },
});

// Every "Apply to the association" application, newest first. Admins only.
export const listAssociationApplications = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const apps = await ctx.db.query("associationApplications").order("desc").collect();
    return Promise.all(
      apps.map(async (a) => ({
        ...a,
        cvUrl: await ctx.storage.getUrl(a.cvId),
        videoUrl: a.videoId ? await ctx.storage.getUrl(a.videoId) : null,
      })),
    );
  },
});

// Move an application to another recruitment stage. Admins only.
export const setApplicationStage = mutation({
  args: { id: v.id("associationApplications"), stage: stageValidator },
  handler: async (ctx, { id, stage }) => {
    await requireAdmin(ctx);
    const app = await ctx.db.get(id);
    if (!app) throw new ConvexError("Application not found.");
    if ((app.stage ?? "applied") === stage) return;
    await ctx.db.patch(id, { stage, stageChangedAt: Date.now() });
  },
});

// Internal notes on an application (interview feedback etc.). Admins only.
export const setApplicationNotes = mutation({
  args: { id: v.id("associationApplications"), notes: v.string() },
  handler: async (ctx, { id, notes }) => {
    await requireAdmin(ctx);
    if (!(await ctx.db.get(id))) throw new ConvexError("Application not found.");
    await ctx.db.patch(id, { notes: notes.trim().slice(0, 5000) || undefined });
  },
});
