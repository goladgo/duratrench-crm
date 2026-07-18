import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import {
  FIRST_REPORT_SINCE,
  getDesignFirmReportData,
  getLastReportRunForRep,
  recordReportRun,
  reportDataIsEmpty,
  type DesignFirmReportData,
} from "@/lib/queries/reports";
import { getRepReportFloor, getRepTerritories } from "@/lib/reps";
import { TERRITORY_LABELS } from "@/lib/territory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CATEGORY_LABELS: Record<string, string> = {
  civil_engineering: "Civil Engineering",
  landscape_architecture: "Landscape Architecture",
};
const ACTIVITY_LABELS: Record<string, string> = { visit: "Visit", call: "Call", email: "Email" };

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = 60;

const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.42, 0.42, 0.46);
const ACCENT = rgb(0.15, 0.35, 0.62);
const RULE = rgb(0.82, 0.82, 0.85);

function fmtDate(iso: string): string {
  // Accepts a date ("2026-07-17") or a timestamp; render as M/D/YYYY without TZ drift
  // for plain dates.
  const datePart = iso.length >= 10 && iso[4] === "-" ? iso.slice(0, 10) : iso;
  const [y, m, d] = datePart.split(/[-T]/);
  if (y && m && d) return `${Number(m)}/${Number(d)}/${y}`;
  return new Date(iso).toLocaleDateString("en-US");
}

// Minimal cursor-based layout over pdf-lib: wraps text to the content width and adds
// pages as the cursor runs past the bottom margin.
class Layout {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;

  constructor(doc: PDFDocument, font: PDFFont, bold: PDFFont) {
    this.doc = doc;
    this.font = font;
    this.bold = bold;
    this.page = doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }

  private wrap(text: string, font: PDFFont, size: number): string[] {
    const lines: string[] = [];
    for (const raw of text.split("\n")) {
      const words = raw.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        lines.push("");
        continue;
      }
      let line = "";
      for (const w of words) {
        const trial = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(trial, size) > CONTENT_W && line) {
          lines.push(line);
          line = w;
        } else {
          line = trial;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  ensure(space: number) {
    if (this.y - space < BOTTOM) {
      this.page = this.doc.addPage([PAGE_W, PAGE_H]);
      this.y = PAGE_H - MARGIN;
    }
  }

  gap(h: number) {
    this.y -= h;
  }

  text(
    content: string,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; lineGap?: number } = {}
  ) {
    const size = opts.size ?? 10;
    const font = opts.font ?? this.font;
    const color = opts.color ?? INK;
    const indent = opts.indent ?? 0;
    const lineGap = opts.lineGap ?? 3;
    const lineH = size + lineGap;
    for (const line of this.wrap(content, font, size)) {
      this.ensure(lineH);
      this.page.drawText(line, { x: MARGIN + indent, y: this.y - size, size, font, color });
      this.y -= lineH;
    }
  }

  sectionHeading(title: string, count: number) {
    this.ensure(30);
    this.gap(8);
    this.page.drawText(`${title} (${count})`, {
      x: MARGIN,
      y: this.y - 12,
      size: 12,
      font: this.bold,
      color: ACCENT,
    });
    this.y -= 16;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_W - MARGIN, y: this.y },
      thickness: 0.75,
      color: RULE,
    });
    this.y -= 8;
  }
}

function renderSections(L: Layout, data: DesignFirmReportData) {
  // New Design Firms
  L.sectionHeading("New Design Firms", data.firms.length);
  if (data.firms.length === 0) {
    L.text("None since last report.", { color: MUTED, size: 9.5 });
  } else {
    for (const f of data.firms) {
      L.text(`${f.companyName}  —  ${CATEGORY_LABELS[f.category] ?? f.category}`, { font: L.bold, size: 10.5 });
      if (f.address) L.text(f.address, { color: MUTED, size: 9.5, indent: 10 });
      L.text(`Added ${fmtDate(f.createdAt)}`, { color: MUTED, size: 9, indent: 10 });
      L.gap(4);
    }
  }

  // New Contacts
  L.sectionHeading("New Contacts", data.contacts.length);
  if (data.contacts.length === 0) {
    L.text("None since last report.", { color: MUTED, size: 9.5 });
  } else {
    for (const c of data.contacts) {
      const titlePart = c.title ? `, ${c.title}` : "";
      L.text(`${c.contactName}${titlePart}`, { font: L.bold, size: 10.5 });
      L.text(`${c.companyName}${c.officeName ? ` — ${c.officeName}` : ""}`, { color: MUTED, size: 9.5, indent: 10 });
      const reach = [c.phone, c.email].filter(Boolean).join("   ·   ");
      if (reach) L.text(reach, { size: 9.5, indent: 10 });
      L.gap(4);
    }
  }

  // Activity Notes
  L.sectionHeading("Activity Notes", data.activity.length);
  if (data.activity.length === 0) {
    L.text("None since last report.", { color: MUTED, size: 9.5 });
  } else {
    for (const a of data.activity) {
      const who = a.contactName ? ` · ${a.contactName}` : "";
      L.text(`${fmtDate(a.activityDate)} · ${ACTIVITY_LABELS[a.activityType] ?? a.activityType} · ${a.companyName}${a.officeName ? ` (${a.officeName})` : ""}${who}`, {
        font: L.bold,
        size: 10,
      });
      L.text(a.notes, { size: 9.5, indent: 10 });
      L.gap(4);
    }
  }

  // Scheduled Lunch & Learns
  L.sectionHeading("Scheduled Lunch & Learns", data.lunchLearns.length);
  if (data.lunchLearns.length === 0) {
    L.text("None newly scheduled since last report.", { color: MUTED, size: 9.5 });
  } else {
    for (const ll of data.lunchLearns) {
      L.text(`${fmtDate(ll.scheduledAt)} · ${ll.companyName}${ll.officeName ? ` — ${ll.officeName}` : ""}${ll.city ? ` (${ll.city})` : ""}`, {
        size: 10,
      });
    }
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not authenticated", { status: 401 });

  const lastRun = await getLastReportRunForRep(user.id);
  // Watermark from this rep's last report, floored by any one-time backlog cutoff (see
  // getRepReportFloor) so a rep's initial import doesn't flood their first report. Once
  // they've generated once, the watermark is newer than the floor and wins.
  const watermark = lastRun?.generated_at ?? FIRST_REPORT_SINCE;
  const floor = getRepReportFloor(user.email);
  const since = floor && floor > watermark ? floor : watermark;

  const data = await getDesignFirmReportData(since);

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const L = new Layout(doc, font, bold);

  const email = user.email ?? "unknown";
  const territoryLabel = getRepTerritories(user.email, [])
    .map((t) => TERRITORY_LABELS[t])
    .join(" & ");
  const generatedOn = new Date();

  // Header
  L.page.drawText("Design Firm Activity Report", { x: MARGIN, y: L.y - 18, size: 18, font: bold, color: INK });
  L.y -= 30;
  L.text(`Rep: ${email}${territoryLabel ? `  ·  ${territoryLabel}` : ""}`, { color: MUTED, size: 10 });
  L.text(
    `Generated ${generatedOn.toLocaleDateString("en-US")}  ·  covers activity ${
      lastRun ? `since last report (${fmtDate(lastRun.generated_at)})` : "to date (first report)"
    }`,
    { color: MUTED, size: 10 }
  );
  L.gap(6);

  if (reportDataIsEmpty(data)) {
    L.gap(10);
    L.text("No new design firm activity since your last report.", { size: 11 });
  } else {
    renderSections(L, data);
  }

  const bytes = await doc.save();

  // Record the run only after the PDF is fully built -- if anything above throws we
  // don't want to have advanced this rep's watermark and silently drop those rows from
  // their next report.
  await recordReportRun(user.id, email);

  const filename = `design-firm-activity-${generatedOn.toISOString().slice(0, 10)}.pdf`;
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
