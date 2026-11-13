// Excel (.xlsx) and PowerPoint (.pptx) exports of the expenses ledger and check-ups, built in the browser.
// The Hub (components/legacy/site.js) builds the report model from what the signed-in person may see;
// the libraries are only loaded when someone clicks a download button.

export type ReportModel = {
  file: string; // file name without extension
  title: string; // "Expenses ledger", "Monthly check-up"
  scope: string; // "Finance · every team"
  period: string; // "November 2026"
  generated: string; // "13 Nov 2026"
  example: boolean; // contains example rows
  highlights?: string; // key messages typed in the Hub: their own slide and a line on the Summary sheet
  kpis: { label: string; value: string; note: string }[];
  teams: { team: string; budget: number; approved: number; paid: number; waiting: number; rejected: number; left: number }[];
  depts: { dept: string; count: number; approved: number; paid: number; waiting: number; rejected: number }[];
  rows: { date: string; team: string; dept: string; item: string; cat: string; amount: number; status: string; by: string; decidedBy: string; reason: string; link: string }[];
  history: { at: string; team: string; item: string; action: string; by: string; reason: string }[];
  checkups: { at: string; scope: string; status: string; note: string; by: string }[];
};

const NAVY = "000B3D";
const BLUE = "0308A0";
const MIST = "ECEDF2";
const SOFT = "4A5070";
const LILAC = "8E93E8";
const EUR = '#,##0 "€"';

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportXlsx(m: ReportModel) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Esade Sports Hub";
  wb.created = new Date();
  const head = (row: import("exceljs").Row) => {
    row.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + NAVY } };
      c.alignment = { vertical: "middle" };
    });
    row.height = 20;
  };
  const table = (ws: import("exceljs").Worksheet, cols: { header: string; key: string; width: number; money?: boolean }[], data: Record<string, unknown>[], at: number) => {
    const hr = ws.getRow(at);
    cols.forEach((c, i) => {
      hr.getCell(i + 1).value = c.header;
      ws.getColumn(i + 1).width = Math.max(ws.getColumn(i + 1).width ?? 0, c.width);
    });
    head(hr);
    data.forEach((d, r) => {
      const row = ws.getRow(at + 1 + r);
      cols.forEach((c, i) => {
        const cell = row.getCell(i + 1);
        cell.value = (d[c.key] as string | number) ?? "";
        if (c.money) cell.numFmt = EUR;
        cell.alignment = { vertical: "top", wrapText: c.width >= 30 };
      });
      if (r % 2) row.eachCell({ includeEmpty: true }, (cell) => (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + MIST } }));
    });
    return at + 1 + data.length;
  };

  // Summary
  const s = wb.addWorksheet("Summary", { views: [{ showGridLines: false }] });
  s.getCell("A1").value = "ESADE SPORTS";
  s.getCell("A1").font = { bold: true, italic: true, size: 11, color: { argb: "FF" + BLUE } };
  s.getCell("A2").value = m.title.toUpperCase();
  s.getCell("A2").font = { bold: true, italic: true, size: 20, color: { argb: "FF" + NAVY } };
  s.getCell("A3").value = `${m.scope} · ${m.period}`;
  s.getCell("A3").font = { size: 11, color: { argb: "FF" + SOFT } };
  s.getCell("A4").value = `Generated ${m.generated} from the Hub. Updates every time a request is decided.` + (m.example ? " Contains example rows." : "");
  s.getCell("A4").font = { size: 9, italic: true, color: { argb: "FF" + SOFT } };
  let r = 6;
  if (m.highlights?.trim()) {
    s.getCell("A5").value = "Key messages: " + m.highlights.trim().replace(/\s*\n\s*/g, " · ");
    s.getCell("A5").font = { size: 10, bold: true, color: { argb: "FF" + NAVY } };
  }
  m.kpis.forEach((k, i) => {
    const c = s.getCell(r, 1 + i * 2);
    c.value = k.label.toUpperCase();
    c.font = { bold: true, size: 9, color: { argb: "FF" + SOFT } };
    const v = s.getCell(r + 1, 1 + i * 2);
    v.value = k.value;
    v.font = { bold: true, size: 16, color: { argb: "FF" + NAVY } };
    const n = s.getCell(r + 2, 1 + i * 2);
    n.value = k.note;
    n.font = { size: 9, color: { argb: "FF" + SOFT } };
  });
  r += 4;
  s.getCell(r, 1).value = "Budget by team";
  s.getCell(r, 1).font = { bold: true, size: 12, color: { argb: "FF" + NAVY } };
  r = table(s, [
    { header: "Team", key: "team", width: 26 },
    { header: "Budget", key: "budget", width: 12, money: true },
    { header: "Validated", key: "approved", width: 12, money: true },
    { header: "Paid", key: "paid", width: 12, money: true },
    { header: "Waiting", key: "waiting", width: 12, money: true },
    { header: "Rejected", key: "rejected", width: 12, money: true },
    { header: "Left", key: "left", width: 12, money: true },
  ], m.teams, r + 1) + 2;
  s.getCell(r, 1).value = "By department";
  s.getCell(r, 1).font = { bold: true, size: 12, color: { argb: "FF" + NAVY } };
  table(s, [
    { header: "Department", key: "dept", width: 26 },
    { header: "Requests", key: "count", width: 12 },
    { header: "Validated", key: "approved", width: 12, money: true },
    { header: "Paid", key: "paid", width: 12, money: true },
    { header: "Waiting", key: "waiting", width: 12, money: true },
    { header: "Rejected", key: "rejected", width: 12, money: true },
  ], m.depts, r + 1);

  // Ledger: one line per expense, filterable.
  const l = wb.addWorksheet("Ledger", { views: [{ state: "frozen", ySplit: 1 }] });
  const end = table(l, [
    { header: "Date", key: "date", width: 12 },
    { header: "Team", key: "team", width: 22 },
    { header: "Department", key: "dept", width: 18 },
    { header: "Expense", key: "item", width: 34 },
    { header: "Category", key: "cat", width: 14 },
    { header: "Amount", key: "amount", width: 12, money: true },
    { header: "Status", key: "status", width: 12 },
    { header: "Requested by", key: "by", width: 28 },
    { header: "Decided by", key: "decidedBy", width: 28 },
    { header: "Reason", key: "reason", width: 36 },
    { header: "Link", key: "link", width: 30 },
  ], m.rows, 1);
  l.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, end - 1), column: 11 } };

  const h = wb.addWorksheet("Decision history", { views: [{ state: "frozen", ySplit: 1 }] });
  table(h, [
    { header: "When", key: "at", width: 18 },
    { header: "Team", key: "team", width: 22 },
    { header: "Expense", key: "item", width: 34 },
    { header: "Action", key: "action", width: 14 },
    { header: "By", key: "by", width: 30 },
    { header: "Reason", key: "reason", width: 40 },
  ], m.history, 1);

  const c = wb.addWorksheet("Check-ups", { views: [{ state: "frozen", ySplit: 1 }] });
  table(c, [
    { header: "When", key: "at", width: 18 },
    { header: "Scope", key: "scope", width: 30 },
    { header: "Status", key: "status", width: 12 },
    { header: "Note", key: "note", width: 60 },
    { header: "By", key: "by", width: 30 },
  ], m.checkups, 1);

  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), m.file + ".xlsx");
}

const eur = (n: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export async function exportPptx(m: ReportModel) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const p = new PptxGenJS();
  p.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  p.author = "Esade Sports Hub";
  p.title = `${m.title} · ${m.period}`;
  const F = "Arial";
  const W = 13.33;

  p.defineSlideMaster({
    title: "ES",
    background: { color: "FFFFFF" },
    objects: [
      { rect: { x: 0, y: 0, w: W, h: 0.12, fill: { color: NAVY } } },
      { text: { text: "ESADE SPORTS", options: { x: 0.5, y: 7.0, w: 4, h: 0.3, fontFace: F, fontSize: 9, bold: true, italic: true, color: BLUE } } },
      { text: { text: `${m.scope} · ${m.period}`, options: { x: 4.5, y: 7.0, w: 8.3, h: 0.3, fontFace: F, fontSize: 9, color: SOFT, align: "right" } } },
    ],
    slideNumber: { x: 12.85, y: 7.0, w: 0.4, h: 0.3, fontFace: F, fontSize: 9, color: SOFT },
  });
  const heading = (s: import("pptxgenjs").default.Slide, eyebrow: string, title: string) => {
    s.addText(eyebrow.toUpperCase(), { x: 0.5, y: 0.35, w: 12, h: 0.3, fontFace: F, fontSize: 11, bold: true, color: BLUE, charSpacing: 2 });
    s.addText(title.toUpperCase(), { x: 0.5, y: 0.65, w: 12, h: 0.7, fontFace: F, fontSize: 28, bold: true, italic: true, color: NAVY });
    s.addShape(p.ShapeType.rect, { x: 0.5, y: 1.38, w: 0.9, h: 0.06, fill: { color: LILAC }, line: { color: LILAC } });
  };
  const hdr = (cells: string[]) => cells.map((t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: NAVY } } }));

  // 1. Cover
  const cover = p.addSlide();
  cover.background = { color: NAVY };
  cover.addShape(p.ShapeType.parallelogram, { x: 0.5, y: 2.2, w: 6.8, h: 0.5, fill: { color: BLUE }, line: { color: BLUE } });
  cover.addText("ESADE SPORTS", { x: 0.75, y: 2.2, w: 6.4, h: 0.5, fontFace: F, fontSize: 16, bold: true, italic: true, color: "FFFFFF" });
  cover.addText(m.title.toUpperCase(), { x: 0.5, y: 2.9, w: 12, h: 1.2, fontFace: F, fontSize: 48, bold: true, italic: true, color: "FFFFFF" });
  cover.addText(`${m.scope}\n${m.period}`, { x: 0.5, y: 4.2, w: 12, h: 1, fontFace: F, fontSize: 18, color: "B9BEDA" });
  cover.addText(`Generated ${m.generated} from the Esade Sports Hub${m.example ? " · contains example data" : ""}`, { x: 0.5, y: 6.6, w: 12, h: 0.4, fontFace: F, fontSize: 11, color: "B9BEDA" });

  // 2. Key figures
  const k = p.addSlide({ masterName: "ES" });
  heading(k, m.period, "Key figures");
  const n = Math.max(1, m.kpis.length), gap = 0.25, tw = (W - 1 - gap * (n - 1)) / n;
  m.kpis.forEach((x, i) => {
    const X = 0.5 + i * (tw + gap);
    k.addShape(p.ShapeType.rect, { x: X, y: 2.0, w: tw, h: 2.6, fill: { color: MIST }, line: { color: MIST } });
    k.addShape(p.ShapeType.rect, { x: X, y: 2.0, w: 0.08, h: 2.6, fill: { color: BLUE }, line: { color: BLUE } });
    k.addText(x.label.toUpperCase(), { x: X + 0.3, y: 2.2, w: tw - 0.4, h: 0.4, fontFace: F, fontSize: 11, bold: true, color: SOFT });
    k.addText(x.value, { x: X + 0.3, y: 2.7, w: tw - 0.4, h: 1, fontFace: F, fontSize: 32, bold: true, color: NAVY, fit: "shrink" });
    k.addText(x.note, { x: X + 0.3, y: 3.75, w: tw - 0.4, h: 0.7, fontFace: F, fontSize: 11, color: SOFT, valign: "top" });
  });
  const issues = m.checkups.filter((c) => c.status === "Issues").length;
  k.addText(issues ? `${issues} issue${issues === 1 ? "" : "s"} flagged in check-ups this period.` : "No issues flagged in check-ups this period.", {
    x: 0.5, y: 5.1, w: 12, h: 0.5, fontFace: F, fontSize: 14, bold: true, color: issues ? "B42318" : "067647",
  });

  // 2b. Key messages (typed in the Hub; edit freely in PowerPoint)
  if (m.highlights?.trim()) {
    const hsl = p.addSlide({ masterName: "ES" });
    heading(hsl, m.period, "Key messages");
    hsl.addText(m.highlights.trim().split(/\n+/).filter(Boolean).map((t) => ({ text: t.trim(), options: { bullet: true, breakLine: true } })), {
      x: 0.5, y: 1.8, w: 12.3, h: 4.8, fontFace: F, fontSize: 20, color: NAVY, valign: "top", paraSpaceAfter: 10,
    });
  }

  // 3. Spending by team (chart)
  const teams = m.teams.filter((t) => t.budget || t.approved || t.waiting || t.paid);
  if (teams.length) {
    const s = p.addSlide({ masterName: "ES" });
    heading(s, "Budget", "Spending by team");
    s.addChart(p.ChartType.bar, [
      { name: "Paid", labels: teams.map((t) => t.team), values: teams.map((t) => t.paid) },
      { name: "Validated, not paid", labels: teams.map((t) => t.team), values: teams.map((t) => Math.max(0, t.approved - t.paid)) },
      { name: "Waiting", labels: teams.map((t) => t.team), values: teams.map((t) => t.waiting) },
      { name: "Left", labels: teams.map((t) => t.team), values: teams.map((t) => t.left) },
    ], {
      x: 0.5, y: 1.6, w: 12.3, h: 5.2, barDir: "bar", barGrouping: "stacked", chartColors: [NAVY, BLUE, LILAC, "D6D8E3"],
      showLegend: true, legendPos: "b", legendFontFace: F, legendFontSize: 11, catAxisLabelFontFace: F, catAxisLabelFontSize: 11,
      valAxisLabelFontFace: F, valAxisLabelFontSize: 10, valAxisLabelFormatCode: '#,##0 "€"', catAxisOrientation: "minMax",
      valGridLine: { color: "E5E7EF", size: 0.5 },
    });
  }

  // 4. Budget table + departments
  if (m.teams.length) {
    const s = p.addSlide({ masterName: "ES" });
    heading(s, "Budget", "Where each team stands");
    const rows = [hdr(["Team", "Budget", "Validated", "Paid", "Waiting", "Left"])].concat(
      m.teams.map((t) => [t.team, eur(t.budget), eur(t.approved), eur(t.paid), eur(t.waiting), eur(t.left)].map((x) => ({ text: x, options: {} as never }))),
    );
    s.addTable(rows as never, { x: 0.5, y: 1.65, w: 12.3, colW: [3.8, 1.7, 1.7, 1.7, 1.7, 1.7], fontFace: F, fontSize: 11, color: NAVY, border: { type: "solid", color: "D6D8E3", pt: 0.5 }, rowH: 0.36, autoPage: true, autoPageRepeatHeader: true, newSlideStartY: 1.65 });
  }
  if (m.depts.length) {
    const s = p.addSlide({ masterName: "ES" });
    heading(s, "Departments", "Spending by department");
    const rows = [hdr(["Department", "Requests", "Validated", "Paid", "Waiting", "Rejected"])].concat(
      m.depts.map((d) => [d.dept, String(d.count), eur(d.approved), eur(d.paid), eur(d.waiting), eur(d.rejected)].map((x) => ({ text: x, options: {} as never }))),
    );
    s.addTable(rows as never, { x: 0.5, y: 1.65, w: 12.3, colW: [3.8, 1.7, 1.7, 1.7, 1.7, 1.7], fontFace: F, fontSize: 12, color: NAVY, border: { type: "solid", color: "D6D8E3", pt: 0.5 }, rowH: 0.42 });
  }

  // 5. Decisions in the period (paginated)
  const per = 11;
  for (let i = 0; i < Math.max(1, Math.ceil(m.rows.length / per)); i++) {
    const s = p.addSlide({ masterName: "ES" });
    heading(s, m.period, i ? "Expenses (continued)" : "Expenses");
    const part = m.rows.slice(i * per, (i + 1) * per);
    if (!part.length) {
      s.addText("No expenses in this period.", { x: 0.5, y: 2, w: 12, h: 0.5, fontFace: F, fontSize: 16, color: SOFT });
      continue;
    }
    const rows = [hdr(["Date", "Team", "Expense", "Amount", "Status", "Decided by"])].concat(
      part.map((e) => [e.date, e.team, e.item, eur(e.amount), e.status, e.decidedBy || "—"].map((x) => ({ text: x, options: {} as never }))),
    );
    s.addTable(rows as never, { x: 0.5, y: 1.65, w: 12.3, colW: [1.2, 2.6, 3.6, 1.2, 1.3, 2.4], fontFace: F, fontSize: 10, color: NAVY, border: { type: "solid", color: "D6D8E3", pt: 0.5 }, rowH: 0.4 });
  }

  // 6. Rejections and reconsidered decisions, with the reasons
  const why = m.history.filter((h) => h.reason);
  if (why.length) {
    const s = p.addSlide({ masterName: "ES" });
    heading(s, "Decisions", "Rejections and reconsiderations");
    const rows = [hdr(["When", "Team", "Expense", "Action", "Reason", "By"])].concat(
      why.slice(0, 12).map((h) => [h.at, h.team, h.item, h.action, h.reason, h.by].map((x) => ({ text: x, options: {} as never }))),
    );
    s.addTable(rows as never, { x: 0.5, y: 1.65, w: 12.3, colW: [1.4, 2.0, 2.4, 1.3, 3.2, 2.0], fontFace: F, fontSize: 10, color: NAVY, border: { type: "solid", color: "D6D8E3", pt: 0.5 } });
  }

  // 7. Check-up notes
  const s = p.addSlide({ masterName: "ES" });
  heading(s, "Check-up", "Notes and issues");
  if (!m.checkups.length) s.addText("No check-up notes yet for this period.", { x: 0.5, y: 2, w: 12, h: 0.5, fontFace: F, fontSize: 16, color: SOFT });
  else {
    const rows = [hdr(["When", "Scope", "Status", "Note", "By"])].concat(
      m.checkups.slice(0, 12).map((c) => [c.at, c.scope, c.status, c.note || "—", c.by].map((x, j) => ({ text: x, options: (j === 2 ? { bold: true, color: x === "Issues" ? "B42318" : "067647" } : {}) as never }))),
    );
    s.addTable(rows as never, { x: 0.5, y: 1.65, w: 12.3, colW: [1.5, 2.6, 1.1, 4.6, 2.5], fontFace: F, fontSize: 10, color: NAVY, border: { type: "solid", color: "D6D8E3", pt: 0.5 } });
  }

  const blob = (await p.write({ outputType: "blob" })) as Blob;
  download(blob, m.file + ".pptx");
}
