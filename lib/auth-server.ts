import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
// The Convex HTTP actions URL: same deployment, ".convex.site" instead of ".convex.cloud".
const convexSiteUrl =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL || convexUrl.replace(/\.convex\.cloud\/?$/, ".convex.site");

// Built on first request so the site still builds without Convex env vars.
let auth: ReturnType<typeof convexBetterAuthNextJs> | null = null;
function getAuth() {
  if (!auth) auth = convexBetterAuthNextJs({ convexUrl, convexSiteUrl });
  return auth;
}

const fail = (status: number, message: string) => Response.json({ message }, { status });

// Proxies /api/auth/* to Convex, and turns setup problems into readable errors.
async function forward(method: "GET" | "POST", request: Request) {
  if (!convexUrl) return fail(500, "NEXT_PUBLIC_CONVEX_URL was not set when the site was built on Vercel.");
  try {
    const res = await getAuth().handler[method](request);
    const json = (res.headers.get("content-type") ?? "").includes("json");
    if (!json && res.status === 404) {
      return fail(404, `No sign-in routes on Convex (${convexSiteUrl}). The Convex functions are not deployed to this deployment: check the Vercel build command runs "npx convex deploy".`);
    }
    if (!json && res.status >= 500) {
      return fail(res.status, `Convex returned an error (${convexSiteUrl}). See the Logs tab in the Convex dashboard.`);
    }
    return res;
  } catch (e) {
    return fail(502, `Could not reach Convex at ${convexSiteUrl}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export const handler = {
  GET: (request: Request) => forward("GET", request),
  POST: (request: Request) => forward("POST", request),
};
