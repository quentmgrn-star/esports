import { ConvexError, v } from "convex/values";
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

const DEPARTMENTS = ["Finance", "Media & Marketing", "Operations", "Partnerships"];

// Upload URL for the CV and optional video of an association application.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

export const submitAssociationApplication = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    programme: v.string(),
    year: v.string(),
    linkedin: v.optional(v.string()),
    pref1: v.string(),
    pref2: v.optional(v.string()),
    motivation: v.string(),
    cvId: v.id("_storage"),
    videoId: v.optional(v.id("_storage")),
    acceptsRedirect: v.boolean(),
    confirmsAccuracy: v.boolean(),
  },
  handler: async (ctx, args) => {
    const clean = (s: string, max: number) => s.trim().slice(0, max);
    const a = {
      ...args,
      firstName: clean(args.firstName, 100),
      lastName: clean(args.lastName, 100),
      email: clean(args.email, 200),
      phone: clean(args.phone, 50),
      programme: clean(args.programme, 100),
      year: clean(args.year, 50),
      linkedin: args.linkedin ? clean(args.linkedin, 300) : undefined,
      motivation: clean(args.motivation, 5000),
      pref2: args.pref2 || undefined,
    };
    if (!a.firstName || !a.lastName || !a.email || !a.phone || !a.programme || !a.year || !a.motivation) {
      throw new ConvexError("Missing required fields.");
    }
    if (!DEPARTMENTS.includes(a.pref1) || (a.pref2 && (!DEPARTMENTS.includes(a.pref2) || a.pref2 === a.pref1))) {
      throw new ConvexError("Invalid department preferences.");
    }
    if (!a.acceptsRedirect || !a.confirmsAccuracy) throw new ConvexError("Both acknowledgements are required.");
    return ctx.db.insert("associationApplications", { ...a, stage: "applied", stageChangedAt: Date.now() });
  },
});
