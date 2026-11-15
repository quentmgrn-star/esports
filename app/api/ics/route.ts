// "Add to calendar" file (.ics) for a game or event. Served from our own site with the
// text/calendar type, so iPhone/Mac Safari shows "Add to Calendar", Outlook desktop opens it
// and Android hands it to the calendar app. "inline" matters: with "attachment" iPhone Safari shows a blank page.
// Times arrive in UTC (…Z), so no time-zone guessing.
export const runtime = "nodejs";

const UTC = /^\d{8}T\d{6}Z$/;
const clip = (s: string | null, n: number) => (s || "").slice(0, n);
// Escape text for iCalendar and fold long lines (75 octets max per line).
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, "\\$&").replace(/\r?\n/g, "\\n");
function fold(line: string) {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > 74) { out.push(cur); cur = " " + ch; } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const start = q.get("s") || "", end = q.get("e") || "";
  if (!UTC.test(start) || !UTC.test(end)) return new Response("Bad date", { status: 400 });
  const title = clip(q.get("t"), 200) || "Esade Sports";
  const id = clip(q.get("id"), 60).replace(/[^a-z0-9-]/gi, "") || "event";
  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Esade Sports//Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:${id}-${start}@esadesports`, `DTSTAMP:${now}`, `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${esc(title)}`, `LOCATION:${esc(clip(q.get("l"), 300))}`, `DESCRIPTION:${esc(clip(q.get("d"), 1000))}`,
    "END:VEVENT", "END:VCALENDAR",
  ];
  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="esade-sports-${id}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
