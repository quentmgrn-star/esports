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

const DEPARTMENTS = ["Finance", "Media & Marketing", "Operations", "Partnerships", "IT"];

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
    phone: v.optional(v.string()),
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
    const phone = args.phone?.replace(/[^\d+]/g, "").slice(0, 20) || undefined;
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
    const id = await ctx.db.insert("contactMessages", { topic: args.topic, name, email, subject, message, sport, phone, status: "new" });
    // Email a copy to the right people after saving; a failed email never loses the message.
    await ctx.scheduler.runAfter(0, internal.notify.emailContactMessage, { id });
    return id;
  },
});

// Alumni corner: anyone can send a profile, it waits for an admin's approval before it is public.
// "website" is a honeypot field, like on the contact form.
const short = (s: string | undefined, n: number) => (s ?? "").trim().slice(0, n);
const domain = (s: string | undefined) =>
  short(s, 100).toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#\s]/)[0] || undefined;
export const submitAlumniProfile = mutation({
  args: {
    first: v.string(),
    last: v.string(),
    nationality: v.string(),
    programme: v.string(),
    grad: v.number(),
    sports: v.array(v.string()),
    esadeRole: v.optional(v.string()),
    headline: v.optional(v.string()),
    exUni: v.string(),
    exDomain: v.optional(v.string()),
    exCity: v.string(),
    inCo: v.string(),
    inDomain: v.optional(v.string()),
    inRole: v.string(),
    interns: v.array(v.object({ co: v.string(), role: v.string(), year: v.optional(v.string()), domain: v.optional(v.string()) })),
    assocs: v.array(v.object({ name: v.string(), domain: v.optional(v.string()) })),
    linkedin: v.optional(v.string()),
    photo: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    consent: v.boolean(),
    website: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    if (a.website) return null;
    const email = short(a.email, 200).toLowerCase();
    if (!EMAIL_RE.test(email)) throw new ConvexError("Please enter a valid email address.");
    if (!a.consent) throw new ConvexError("Please tick the consent box.");
    const year = new Date().getFullYear() + 1;
    if (!Number.isInteger(a.grad) || a.grad < 1991 || a.grad > year) throw new ConvexError("Choose your graduation year.");
    const p = {
      first: short(a.first, 60),
      last: short(a.last, 60),
      nationality: short(a.nationality, 60),
      programme: short(a.programme, 80),
      grad: a.grad,
      sports: a.sports.map((x) => short(x, 40)).filter(Boolean).slice(0, 10),
      esadeRole: short(a.esadeRole, 100) || undefined,
      headline: short(a.headline, 120) || undefined,
      exUni: short(a.exUni, 100),
      exDomain: domain(a.exDomain),
      exCity: short(a.exCity, 80),
      inCo: short(a.inCo, 100),
      inDomain: domain(a.inDomain),
      inRole: short(a.inRole, 100),
      interns: a.interns
        .slice(0, 10)
        .map((x) => ({ co: short(x.co, 100), role: short(x.role, 100), year: short(x.year, 10) || undefined, domain: domain(x.domain) }))
        .filter((x) => x.co || x.role),
      assocs: a.assocs
        .slice(0, 10)
        .map((x) => ({ name: short(x.name, 100), domain: domain(x.domain) }))
        .filter((x) => x.name),
      linkedin: short(a.linkedin, 200).replace(/^https?:\/\//, "") || undefined,
      photo: a.photo && a.photo.startsWith("data:image/") && a.photo.length < 300_000 ? a.photo : undefined,
      email,
      phone: a.phone?.replace(/[^\d+]/g, "").slice(0, 20) || undefined,
    };
    if (!p.first || !p.last || !p.nationality || !p.programme || !p.exUni || !p.exCity || !p.inCo || !p.inRole)
      throw new ConvexError("Please fill in every required field.");
    if (!p.sports.length) throw new ConvexError("Choose at least one sport.");
    // Simple rate limit: at most 3 profiles per email address in 10 minutes.
    const since = Date.now() - 10 * 60 * 1000;
    const recent = await ctx.db
      .query("alumniProfiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.gt(q.field("_creationTime"), since))
      .collect();
    if (recent.length >= 3) throw new ConvexError("You have sent several profiles in a short time. Please wait a few minutes.");
    return await ctx.db.insert("alumniProfiles", { ...p, status: "pending" });
  },
});
