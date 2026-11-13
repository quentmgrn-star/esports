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
