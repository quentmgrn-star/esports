import { ConvexError, v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { authComponent, createAuth, isAdminEmail } from "./auth";
import { getAccess } from "./roles";

// Password help. Two ways back in for someone who forgot their password:
//   1. "Forgot password?" on the sign-in page: Better Auth makes a one-hour link, we email it (sendResetEmail below).
//   2. An admin, the President or a Vice-president sets a temporary password in /admin > Organisation,
//      shown once on their screen to pass on in person. The member is asked to choose their own after signing in.
// Passwords are never stored or logged here: only who did what and when (passwordEvents table).

const norm = (e: string) => e.trim().toLowerCase();

// ---------- 1. Temporary password set by an admin / President / VP ----------

// Who may set a temporary password for `email`. Returns the email of the person doing it.
export const checkCanReset = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<string> => {
    const a = await getAccess(ctx);
    if (!a || a.readOnly || !(a.isAdmin || a.exec)) throw new ConvexError("Only admins, the President and the Vice-presidents can do this.");
    const target = norm(email);
    if (target === a.email) throw new ConvexError("This is your own account: use \"Forgot password?\" on the sign-in page instead.");
    if (!a.isAdmin) {
      // The President / VPs help members; only an admin can reset an admin, the President or a VP.
      const rows = await ctx.db.query("members").withIndex("by_email", (q) => q.eq("email", target)).collect();
      const exec = rows.some((r) => r.status === "approved" && r.role === "board" && (r.position === "president" || r.position === "vice-president"));
      if (exec || isAdminEmail(target)) throw new ConvexError("Only an admin can reset the password of an admin, the President or a Vice-president.");
    }
    return a.email;
  },
});

// Easy to read out or type: no 0/O, 1/l/I. 12 characters, e.g. "k7mq-x2pd-9fta".
function makePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const s = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

export const setTemporary = action({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<{ password: string }> => {
    const by: string = await ctx.runQuery(internal.passwords.checkCanReset, { email });
    const target = norm(email);
    const auth = createAuth(ctx);
    const c = await auth.$context;
    const found = await c.internalAdapter.findUserByEmail(target, { includeAccounts: true });
    if (!found) throw new ConvexError("This person has no account yet. They create it themselves: Sign in > \"No account yet? Create one\".");
    const password = makePassword();
    const hash = await c.password.hash(password);
    if (found.accounts.some((x) => x.providerId === "credential")) await c.internalAdapter.updatePassword(found.user.id, hash);
    else await c.internalAdapter.linkAccount({ userId: found.user.id, providerId: "credential", accountId: found.user.id, password: hash });
    // Signs them out everywhere, so the old password (or whoever had it) is cut off.
    await c.internalAdapter.deleteUserSessions(found.user.id);
    await ctx.runMutation(internal.passwords.logTemporary, { email: target, by });
    return { password };
  },
});

export const logTemporary = internalMutation({
  args: { email: v.string(), by: v.string() },
  handler: async (ctx, { email, by }): Promise<null> => {
    await clear(ctx, email);
    await ctx.db.insert("passwordEvents", { email, kind: "temporary", by, at: Date.now(), mustChange: true });
    return null;
  },
});

async function clear(ctx: MutationCtx, email: string) {
  const rows = await ctx.db.query("passwordEvents").withIndex("by_email", (q) => q.eq("email", email)).collect();
  for (const r of rows) if (r.mustChange) await ctx.db.patch(r._id, { mustChange: false });
}

// Signed in with a temporary password: /admin asks them to choose their own.
export const mustChange = query({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return false;
    const rows = await ctx.db.query("passwordEvents").withIndex("by_email", (q) => q.eq("email", norm(user.email))).collect();
    return rows.some((r) => r.mustChange);
  },
});

// Called after they chose their own password in /admin.
export const changed = mutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (user) await clear(ctx, norm(user.email));
    return null;
  },
});

// After a reset with the email link (Better Auth onPasswordReset, convex/auth.ts).
export const clearMustChange = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<null> => {
    await clear(ctx, norm(email));
    return null;
  },
});

// Last password resets, for /admin > Organisation (admins, President, VPs).
export const recent = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    if (!a || !(a.isAdmin || a.exec)) return [];
    const rows = await ctx.db.query("passwordEvents").order("desc").take(20);
    return rows.map((r) => ({ email: r.email, kind: r.kind, by: r.by ?? null, at: r.at, mustChange: !!r.mustChange, emailStatus: r.emailStatus ?? null }));
  },
});

// ---------- 2. "Forgot password?" email ----------

type Lang = "en" | "ca" | "es";
const RESET: Record<Lang, { subject: string; body: string; close: string }> = {
  en: {
    subject: "Esade Sports · Reset your password",
    body: "Someone (hopefully you) asked to reset the password of your Esade Sports account. Open this link to choose a new password. It works for 1 hour and only once:\n\n{link}\n\nIf you did not ask for this, ignore this email: your password stays the same.",
    close: "Kind regards,\nEsade Sports\n\n(This is an automatic email.)",
  },
  ca: {
    subject: "Esade Sports · Restableix la contrasenya",
    body: "Algú (esperem que tu) ha demanat restablir la contrasenya del teu compte d'Esade Sports. Obre aquest enllaç per triar una contrasenya nova. Funciona durant 1 hora i només una vegada:\n\n{link}\n\nSi no ho has demanat tu, ignora aquest correu: la teva contrasenya no canvia.",
    close: "Salutacions cordials,\nEsade Sports\n\n(Aquest és un correu automàtic.)",
  },
  es: {
    subject: "Esade Sports · Restablece tu contraseña",
    body: "Alguien (esperamos que tú) ha pedido restablecer la contraseña de tu cuenta de Esade Sports. Abre este enlace para elegir una contraseña nueva. Funciona durante 1 hora y solo una vez:\n\n{link}\n\nSi no lo has pedido tú, ignora este correo: tu contraseña no cambia.",
    close: "Un saludo cordial,\nEsade Sports\n\n(Este es un correo automático.)",
  },
};
const HELLO: Record<Lang, string> = { en: "Hello", ca: "Hola", es: "Hola" };

// Records the request. At most 3 reset emails per address per hour; returns null when over the limit.
export const startResetEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<Id<"passwordEvents"> | null> => {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const rows = await ctx.db.query("passwordEvents").withIndex("by_email", (q) => q.eq("email", email)).collect();
    if (rows.filter((r) => r.kind === "reset-email" && r.at > hourAgo).length >= 3) return null;
    return await ctx.db.insert("passwordEvents", { email, kind: "reset-email", at: Date.now(), emailStatus: "sending" });
  },
});

export const setResetEmailStatus = internalMutation({
  args: { id: v.id("passwordEvents"), status: v.string() },
  handler: async (ctx, { id, status }): Promise<null> => {
    await ctx.db.patch(id, { emailStatus: status.slice(0, 300) });
    return null;
  },
});

// Scheduled by Better Auth's sendResetPassword (convex/auth.ts) only when the account exists.
// The sign-in page shows the same answer either way, so nobody can find out who has an account.
export const sendResetEmail = internalAction({
  args: { email: v.string(), name: v.optional(v.string()), token: v.string(), lang: v.optional(v.string()) },
  handler: async (ctx, x): Promise<null> => {
    const email = norm(x.email);
    const id: Id<"passwordEvents"> | null = await ctx.runMutation(internal.passwords.startResetEmail, { email });
    if (!id) return null; // too many requests in the last hour
    const status = async (s: string): Promise<null> => {
      await ctx.runMutation(internal.passwords.setResetEmailStatus, { id, status: s });
      return null;
    };
    const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM, site = process.env.SITE_URL;
    if (!key || !from) return status("not sent: email sending is not set up (RESEND_API_KEY / MAIL_FROM)");
    if (!site) return status("not sent: SITE_URL is not set on Convex");
    const lang: Lang = x.lang === "ca" || x.lang === "es" ? x.lang : "en";
    const link = `${site.replace(/\/$/, "")}/admin?reset=${encodeURIComponent(x.token)}&lang=${lang}`;
    const first = x.name && !x.name.includes("@") ? " " + x.name.split(" ")[0] : "";
    const t = RESET[lang];
    const text = `${HELLO[lang]}${first},\n\n${t.body.replace("{link}", link)}\n\n${t.close}`;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [email], subject: t.subject, text }),
      });
      if (!res.ok) {
        const why = (await res.text()).slice(0, 220);
        console.error("Password reset email failed", res.status, why);
        return status(`failed: ${res.status} ${why}`);
      }
      return status("sent");
    } catch (e) {
      console.error("Password reset email failed", e);
      return status(`failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  },
});
