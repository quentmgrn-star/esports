import { v } from "convex/values";
import { query } from "./_generated/server";

/** Alumni directory, optionally filtered by sport. Contact details are not stored until alumni consent. */
export const list = query({
  args: { sport: v.optional(v.string()) },
  handler: async (ctx, { sport }) => {
    const all = await ctx.db.query("alumni").collect();
    return sport ? all.filter((a) => a.sports.includes(sport)) : all;
  },
});

// Approved profiles from the Alumni corner, for the public website. Never returns email or phone.
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("alumniProfiles")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("desc")
      .collect();
    return rows.map(({ email: _e, phone: _p, status: _s, ...pub }) => pub);
  },
});
