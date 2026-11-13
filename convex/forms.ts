import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

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
  handler: async (ctx, args) => {
    const clean = (s: string | undefined, max: number) => (s ?? "").trim().slice(0, max);
    const a = {
      ...args,
      teamSlug: clean(args.teamSlug, 60),
      firstName: clean(args.firstName, 100),
      lastName: clean(args.lastName, 100),
      email: clean(args.email, 200),
      phone: clean(args.phone, 50),
      programme: clean(args.programme, 150) || undefined,
      level: clean(args.level, 100) || undefined,
      coachingExperience: clean(args.coachingExperience, 3000) || undefined,
    };
    if (!a.teamSlug || !a.firstName || !a.lastName || !a.email || !a.phone) throw new ConvexError("Missing required fields.");
    return ctx.db.insert("teamApplications", { ...a, status: "New", statusChangedAt: Date.now() });
  },
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

export const CONTACT_TOPICS = [
  "Question",
  "Suggestion",
  "Feedback or complaint",
  "Try-outs",
  "Coaching",
  "Partnership or business",
  "Alumni",
  "Other",
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Footer contact form. "website" is a hidden honeypot field: real visitors leave it empty.
export const submitContactMessage = mutation({
  args: {
    topic: v.string(),
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
    sport: v.optional(v.string()),
    consent: v.boolean(),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.website) return null; // bot: pretend it worked, store nothing
    const name = args.name.trim().slice(0, 100);
    const email = args.email.trim().toLowerCase().slice(0, 200);
    const subject = args.subject.trim().slice(0, 150);
    const message = args.message.trim().slice(0, 2000);
    const sport = args.sport?.trim().slice(0, 60) || undefined;
    if (!CONTACT_TOPICS.includes(args.topic)) throw new ConvexError("Choose what your message is about.");
    if (!name || !subject || !message) throw new ConvexError("Please fill in every required field.");
    if (!EMAIL_RE.test(email)) throw new ConvexError("Please enter a valid email address.");
    if (!args.consent) throw new ConvexError("Please accept the privacy policy.");
    // Simple rate limit: at most 3 messages per email address in 10 minutes.
    const since = Date.now() - 10 * 60 * 1000;
    const recent = await ctx.db
      .query("contactMessages")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.gt(q.field("_creationTime"), since))
      .collect();
    if (recent.length >= 3) throw new ConvexError("You have sent several messages in a short time. Please wait a few minutes.");
    const id = await ctx.db.insert("contactMessages", { topic: args.topic, name, email, subject, message, sport, status: "new" });
    // Email a copy to the right people after saving; a failed email never loses the message.
    await ctx.scheduler.runAfter(0, internal.notify.emailContactMessage, { id });
    return id;
  },
});
