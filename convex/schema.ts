import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { stageValidator } from "./stages";

// isExample / dataStatus "example" marks placeholder content that captains still need to replace.
export default defineSchema({
  seasons: defineTable({
    label: v.string(), // "2026-27"
    isCurrent: v.boolean(),
  }).index("by_label", ["label"]),

  sports: defineTable({
    slug: v.string(), // "basketball"
    name: v.string(), // "Basketball"
  }).index("by_slug", ["slug"]),

  teams: defineTable({
    slug: v.string(), // "basketball-men"
    sportId: v.id("sports"),
    name: v.string(),
    squad: v.union(v.literal("Men"), v.literal("Women"), v.literal("Mixed"), v.literal("Open")), // "Open" = one squad for everyone
    league: v.optional(v.string()),
    club: v.optional(v.string()), // the team's name in the league table
    captain: v.optional(v.string()),
    coach: v.optional(v.string()), // volunteer coach
    tryout: v.optional(v.string()),
    source: v.optional(v.string()),
    updated: v.optional(v.string()),
    note: v.optional(v.string()),
    dataStatus: v.union(v.literal("real"), v.literal("example")),
  })
    .index("by_slug", ["slug"])
    .index("by_sport", ["sportId"]),

  players: defineTable({
    teamId: v.id("teams"),
    seasonId: v.id("seasons"),
    name: v.string(),
    number: v.optional(v.number()),
    position: v.optional(v.string()),
    programme: v.optional(v.string()),
    isCaptain: v.boolean(),
    stats: v.record(v.string(), v.number()),
    isExample: v.boolean(),
  }).index("by_team_season", ["teamId", "seasonId"]),

  matches: defineTable({
    teamId: v.id("teams"),
    seasonId: v.id("seasons"),
    date: v.string(),
    time: v.optional(v.string()),
    home: v.string(),
    away: v.string(),
    homeScore: v.optional(v.number()),
    awayScore: v.optional(v.number()),
    resultText: v.optional(v.string()), // free-text result, e.g. padel set scores
    venue: v.string(),
    round: v.optional(v.string()),
    isExample: v.boolean(),
  }).index("by_team_season", ["teamId", "seasonId"]),

  standings: defineTable({
    teamId: v.id("teams"),
    seasonId: v.id("seasons"),
    columns: v.array(v.string()),
    rows: v.array(v.object({ team: v.string(), values: v.array(v.number()) })),
    note: v.optional(v.string()),
    source: v.string(),
    updated: v.string(),
  }).index("by_team_season", ["teamId", "seasonId"]),

  alumni: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    nationality: v.optional(v.string()),
    programme: v.string(),
    gradYear: v.number(),
    sports: v.array(v.string()),
    exchange: v.optional(v.string()),
    internship: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    isExample: v.boolean(),
  }).index("by_grad_year", ["gradYear"]),

  // People who run Esade Sports, besides the admins (ADMIN_EMAILS) and the captains table.
  // Roles and who sees what: see convex/roles.ts and the permissions table in README.md.
  // viewer = read-only on everything (Student Council, Eva Morta), added by an admin only.
  members: defineTable({
    email: v.string(), // lowercase
    name: v.string(),
    role: v.union(v.literal("board"), v.literal("associate"), v.literal("captain"), v.literal("viewer")),
    // board only: president / vice-president (see everything) or head (of `department`)
    position: v.optional(v.union(v.literal("president"), v.literal("vice-president"), v.literal("head"))),
    department: v.optional(v.string()),
    teams: v.optional(v.array(v.string())),
    note: v.optional(v.string()),
    status: v.union(v.literal("requested"), v.literal("approved"), v.literal("rejected"), v.literal("revoked")),
    requestedAt: v.number(),
    decidedBy: v.optional(v.string()),
    decidedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  // Team information written by the captain (or the Board) in the Hub's Team editor.
  // Public on the team page: about, league + page, venue + address, team contact email.
  // Private (signed-in members who see the team): facility and league contact people.
  teamInfo: defineTable({
    teamId: v.string(),
    about: v.optional(v.string()),
    league: v.optional(v.string()),
    leagueUrl: v.optional(v.string()),
    leagueContactName: v.optional(v.string()),
    leagueContactEmail: v.optional(v.string()),
    leagueContactPhone: v.optional(v.string()),
    venue: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    venueContactName: v.optional(v.string()),
    venueContactEmail: v.optional(v.string()),
    venueContactPhone: v.optional(v.string()),
    contact: v.optional(v.string()), // team contact email, shown publicly
    updatedBy: v.string(),
    updatedAt: v.number(),
  }).index("by_team", ["teamId"]),

  // Members' chat. channel: "general", "board", "dept:<Department>" or "sport:<Sport>".
  chatMessages: defineTable({
    channel: v.string(),
    authorEmail: v.string(),
    authorName: v.string(),
    authorRole: v.string(), // badge, e.g. "Board · Finance"
    body: v.string(),
    editedAt: v.optional(v.number()),
  }).index("by_channel", ["channel"]),

  // Profiles sent from the Alumni corner (no login). Shown on the website only once an admin approves them.
  // email and phone stay private: only admins see them in /admin; the public query never returns them.
  alumniProfiles: defineTable({
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
    photo: v.optional(v.string()), // small JPEG data URL (320 px)
    email: v.string(),
    phone: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  })
    .index("by_status", ["status"])
    .index("by_email", ["email"]),

  // Try-outs and "join as coach" (open to Esade students and outsiders).
  teamApplications: defineTable({
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
    status: v.string(), // one of TEAM_STATUSES in convex/stages.ts ("New" for older rows)
    statusChangedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_team", ["teamSlug"]),

  // "Apply to the association" form (associate in a department). Files live in Convex storage.
  associationApplications: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    programme: v.string(), // "BBA"
    year: v.string(), // "2nd year"
    linkedin: v.optional(v.string()),
    pref1: v.string(), // department name, e.g. "Finance"
    pref2: v.optional(v.string()),
    motivation: v.string(),
    cvId: v.id("_storage"),
    videoId: v.optional(v.id("_storage")),
    acceptsRedirect: v.boolean(),
    confirmsAccuracy: v.boolean(),
    // Recruitment pipeline (admin only). Missing on older applications = "applied".
    stage: v.optional(stageValidator),
    stageChangedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  }),

  partnerInquiries: defineTable({
    company: v.string(),
    name: v.string(),
    email: v.string(),
    interest: v.string(),
    message: v.optional(v.string()),
  }),

  // Team captains, added by an admin in /admin. A captain can sign in and sees the contact messages
  // about their teams' sports and the try-out/coach sign-ups for their teams. Team ids: convex/teamList.ts.
  captains: defineTable({
    email: v.string(), // lowercase
    name: v.optional(v.string()),
    teams: v.array(v.string()),
  }).index("by_email", ["email"]),

  // Footer "Contact" form. Public insert only (forms.submitContactMessage); read and status changes are admin-only.
  contactMessages: defineTable({
    topic: v.string(), // one of CONTACT_TOPICS in convex/forms.ts
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
    sport: v.optional(v.string()),
    phone: v.optional(v.string()), // E.164, optional
    status: v.union(v.literal("new"), v.literal("read"), v.literal("answered")),
    // Email copy to the captains (sport messages) or admins (general): "sent", "skipped: …" or "failed: …".
    emailStatus: v.optional(v.string()),
  }).index("by_email", ["email"]),
});
