import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const submitTeamApplication = mutation({
  args: {
    teamSlug: v.string(),
    kind: v.union(v.literal("tryout"), v.literal("coach")),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    esadeStudent: v.boolean(),
    programme: v.optional(v.string()),
    level: v.optional(v.string()),
    coachingExperience: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert("teamApplications", { ...args, status: "New" }),
});

export const submitPartnerInquiry = mutation({
  args: {
    company: v.string(),
    name: v.string(),
    email: v.string(),
    interest: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert("partnerInquiries", args),
});
