import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

// Built on first request so the site still builds without Convex env vars.
let auth: ReturnType<typeof convexBetterAuthNextJs> | null = null;
function getAuth() {
  if (!auth) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
    // The Convex HTTP actions URL: same deployment, ".convex.site" instead of ".convex.cloud".
    const convexSiteUrl =
      process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? convexUrl.replace(/\.convex\.cloud$/, ".convex.site");
    auth = convexBetterAuthNextJs({ convexUrl, convexSiteUrl });
  }
  return auth;
}

export const handler = {
  GET: (request: Request) => getAuth().handler.GET(request),
  POST: (request: Request) => getAuth().handler.POST(request),
};
