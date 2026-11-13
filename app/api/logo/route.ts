// Organisation logos for alumni profiles (universities, companies, associations).
// The browser only talks to our own site; this route fetches the organisation's
// icon from its website domain on the server, so visitors' IPs are never sent to
// a third party. Unknown domains return 404 and the page falls back to initials.
export const runtime = "nodejs";

const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export async function GET(req: Request) {
  const d = (new URL(req.url).searchParams.get("d") || "").toLowerCase();
  if (!DOMAIN.test(d) || d.length > 100) return new Response("Bad domain", { status: 400 });
  try {
    const r = await fetch(`https://www.google.com/s2/favicons?domain=${d}&sz=128`, {
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !type.startsWith("image/")) return new Response("No logo", { status: 404, headers: { "Cache-Control": "public, s-maxage=86400" } });
    return new Response(await r.arrayBuffer(), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=604800, s-maxage=604800" },
    });
  } catch {
    return new Response("No logo", { status: 404 });
  }
}
