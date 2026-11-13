import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { APIError } from "better-auth/api";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

// Admins are the emails listed in the ADMIN_EMAILS Convex environment variable (comma-separated):
//   npx convex env set ADMIN_EMAILS "first@alumni.esade.edu,second@alumni.esade.edu"
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().replace(/^["']|["']$/g, "").trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | undefined | null): boolean {
  return !!email && adminEmails().includes(email.trim().toLowerCase());
}

// The cast only matters until `npx convex dev` regenerates the typed `components`.
export const authComponent = createClient<DataModel>(components.betterAuth as unknown as Parameters<typeof createClient>[0]);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: process.env.SITE_URL,
    database: authComponent.adapter(ctx),
    emailAndPassword: { enabled: true, requireEmailVerification: false },
    databaseHooks: {
      user: {
        create: {
          // Only approved emails can create an account: admins (ADMIN_EMAILS), captains and approved Board members / associates.
          before: async (user) => {
            if (isAdminEmail(user.email)) return;
            const c = ctx as { runQuery?: (q: unknown, args: unknown) => Promise<unknown> };
            const captain = c.runQuery ? await c.runQuery(internal.roles.isCaptainEmail, { email: user.email }) : false;
            if (!captain) {
              throw new APIError("FORBIDDEN", { message: "This email is not approved yet. Request access on the Members page first." });
            }
          },
        },
      },
    },
    plugins: [convex({ authConfig })],
  });
