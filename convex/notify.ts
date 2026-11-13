import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { adminEmails } from "./auth";
import { sportsOf } from "./roles";

// Who gets a copy of a contact message: the captains of every team in that sport
// (e.g. men's and women's basketball), or the admins for general messages.
export const recipients = internalQuery({
  args: { id: v.id("contactMessages") },
  handler: async (ctx, { id }) => {
    const m = await ctx.db.get(id);
    if (!m) return null;
    let to: string[];
    if (m.sport) {
      const captains = await ctx.db.query("captains").collect();
      to = captains.filter((c) => sportsOf(c.teams).has(m.sport!)).map((c) => c.email);
    } else {
      to = adminEmails();
    }
    return { m, to: [...new Set(to)] };
  },
});

export const setEmailStatus = internalMutation({
  args: { id: v.id("contactMessages"), emailStatus: v.string() },
  handler: async (ctx, { id, emailStatus }) => ctx.db.patch(id, { emailStatus }),
});

// Sends the copy with Resend (https://resend.com). Needs RESEND_API_KEY and MAIL_FROM on Convex;
// without them the message is still saved and shown in /admin, only the email is skipped.
export const emailContactMessage = internalAction({
  args: { id: v.id("contactMessages") },
  handler: async (ctx, { id }) => {
    const data = await ctx.runQuery(internal.notify.recipients, { id });
    if (!data) return;
    const { m, to } = data;
    const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
    const status = async (s: string) => ctx.runMutation(internal.notify.setEmailStatus, { id, emailStatus: s });
    if (!key || !from) return status("skipped: email not set up (RESEND_API_KEY / MAIL_FROM)");
    if (to.length === 0) return status(m.sport ? `skipped: no captain for ${m.sport} yet` : "skipped: no admin emails");

    const site = process.env.SITE_URL ?? "";
    const text = [
      `New message on the Esade Sports website${m.sport ? ` about ${m.sport}` : ""}.`,
      "",
      `Topic: ${m.topic}`,
      m.sport ? `Sport: ${m.sport}` : "Sport: general (not about a specific sport)",
      `From: ${m.name} <${m.email}>`,
      m.phone ? `Phone (WhatsApp): ${m.phone}` : "",
      `Subject: ${m.subject}`,
      "",
      m.message,
      "",
      "Reply to this email to answer the sender directly.",
      site ? `See all messages: ${site.replace(/\/$/, "")}/admin` : "",
    ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          reply_to: m.email,
          subject: `[Esade Sports] ${m.sport ? m.sport + " · " : ""}${m.subject}`,
          text,
        }),
      });
      if (!res.ok) return status(`failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
      return status(`sent to ${to.length} recipient${to.length === 1 ? "" : "s"}`);
    } catch (e) {
      return status(`failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  },
});
