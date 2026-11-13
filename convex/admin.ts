import { ConvexError } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import { authComponent, isAdminEmail } from "./auth";

async function requireAdmin(ctx: QueryCtx) {
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
