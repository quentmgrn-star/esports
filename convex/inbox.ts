import { query } from "./_generated/server";
import { canSee, getAccess } from "./roles";
import { canDecide } from "./org";
import { seesApp, seesMessage, tryoutRes } from "./admin";

// "Waiting for you" on the Hub overview: what the signed-in person should act on outside the Hub pages
// (member requests, applications and try-outs live in /admin; partner inquiries in Partnerships).
// Counts only, each one following the same rules as the page it links to.
export const counts = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a || a.readOnly) return null;
    const requests = (await ctx.db.query("members").withIndex("by_status", (q) => q.eq("status", "requested")).collect()).filter((m) => canDecide(a, m)).length;
    const applications = (await ctx.db.query("associationApplications").collect()).filter((x) => (x.stage ?? "applied") === "applied" && !x.openedAt && seesApp(a, x)).length;
    const tryouts = (await ctx.db.query("teamApplications").collect()).filter((x) => (x.status || "New") === "New" && !x.openedAt && canSee(a, tryoutRes(x))).length;
    const inquiries = canSee(a, { dept: "Partnerships" })
      ? (await ctx.db.query("partnerInquiries").collect()).filter((i) => (i.status ?? "new") === "new").length
      : 0;
    const messages = (await ctx.db.query("contactMessages").collect()).filter((m) => m.status === "new" && seesMessage(a, m)).length;
    return { requests, applications, tryouts, inquiries, messages };
  },
});
