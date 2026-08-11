import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { getDailyReportData, type DailyActivityRow, type DailyQuoteRow } from "@/lib/queries/daily-report";
import { getRepTerritories } from "@/lib/reps";
import { TERRITORY_LABELS } from "@/lib/territory";
import { formatISODate } from "@/lib/date-utils";

// Daily Activity Report: a rep's visits/calls/emails + quotes/specs for a single day
// (always "today"), meant to be forwarded to a manager as a quick visual check-in --
// see getDailyReportData for the full rationale. No watermark/report-run tracking here
// (unlike the Design Firm Activity report) since there's nothing to dedupe against --
// each day's report is self-contained and safe to regenerate any time that day.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = 60;

const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.42, 0.42, 0.46);
const ACCENT = rgb(0.15, 0.35, 0.62);
const RULE = rgb(0.82, 0.82, 0.85);
const TILE_FILL = rgb(0.94, 0.96, 0.99);

const ACTIVITY_LABEL: Record<string, string> = { visit: "Visit", call: "Call", email: "Email" };
const KIND_LABEL: Record<string, string> = { quote: "Quote", spec: "Spec" };

function fmtMoney(amount: number | null): string {
  if (amount == null) return "—";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// Cursor-based layout over pdf-lib, same approach as the Design Firm Activity route --
// wraps text to the content width and adds pages as the cursor runs past the bottom
// margin. Adds a `statTiles` method here for the KPI-strip visual this report wanted
// that the text-only Design Firm report never needed.
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

  sectionHeading(title: string) {
    this.ensure(24);
    this.gap(8);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_W - MARGIN, y: this.y },
      thickness: 0.75,
      color: RULE,
    });
    this.y -= 16;
    this.page.drawText(title, { x: MARGIN, y: this.y - 12, size: 13, font: this.bold, color: ACCENT });
    this.y -= 20;
  }

  // A row of KPI tiles across the content width -- the "visual" a manager can read at a
  // glance before the itemized lists below (counts of visits/calls/emails/quotes).
  statTiles(tiles: { label: string; value: string }[]) {
    const tileH = 56;
    const gapPx = 12;
    const tileW = (CONTENT_W - gapPx * (tiles.length - 1)) / tiles.length;
    this.ensure(tileH + 12);
    const top = this.y;
    tiles.forEach((t, i) => {
      const x = MARGIN + i * (tileW + gapPx);
      this.page.drawRectangle({
        x,
        y: top - tileH,
        width: tileW,
        height: tileH,
        color: TILE_FILL,
        borderColor: RULE,
        borderWidth: 0.75,
      });
      const valueSize = 18;
      const valueW = this.bold.widthOfTextAtSize(t.value, valueSize);
      this.page.drawText(t.value, {
        x: x + (tileW - valueW) / 2,
        y: top - 30,
        size: valueSize,
        font: this.bold,
        color: ACCENT,
      });
      const labelSize = 8.5;
      const labelW = this.font.widthOfTextAtSize(t.label, labelSize);
      this.page.drawText(t.label, {
        x: x + (tileW - labelW) / 2,
        y: top - tileH + 12,
        size: labelSize,
        font: this.font,
        color: MUTED,
      });
    });
    this.y = top - tileH - 18;
  }
}

function renderActivity(L: Layout, rows: DailyActivityRow[]) {
  for (const a of rows) {
    const office = [a.companyName, a.locationName].filter(Boolean).join(" — ");
    const who = a.contactName ? ` · ${a.contactName}` : "";
    L.ensure(28);
    L.text(`${ACTIVITY_LABEL[a.activityType] ?? a.activityType} · ${office}${who}`, {
      font: L.bold,
      size: 10.5,
      lineGap: 2,
    });
    if (a.notes) L.text(a.notes, { size: 9.5, indent: 12, color: MUTED });
    L.gap(6);
  }
}

function renderQuotes(L: Layout, rows: DailyQuoteRow[]) {
  for (const q of rows) {
    const office = [q.companyName, q.locationName].filter(Boolean).join(" — ");
    L.ensure(28);
    L.text(`${q.title}  ·  ${KIND_LABEL[q.kind] ?? q.kind}  ·  ${q.stage}`, {
      font: L.bold,
      size: 10.5,
      lineGap: 2,
    });
    L.text(`${office}${q.amount != null ? `  ·  ${fmtMoney(q.amount)}` : ""}`, {
      size: 9.5,
      indent: 12,
      color: MUTED,
    });
    L.gap(6);
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not authenticated", { status: 401 });

  const today = formatISODate(new Date());
  const data = await getDailyReportData(today);

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const L = new Layout(doc, font, bold);

  const email = user.email ?? "unknown";
  const territoryLabel = getRepTerritories(user.email, [])
    .map((t) => TERRITORY_LABELS[t])
    .join(" & ");
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  L.page.drawText("Daily Activity Report", { x: MARGIN, y: L.y - 18, size: 18, font: bold, color: INK });
  L.y -= 30;
  L.text(`${email}${territoryLabel ? `  ·  ${territoryLabel}` : ""}`, { color: MUTED, size: 10 });
  L.text(dateLabel, { color: MUTED, size: 10 });
  L.gap(10);

  L.statTiles([
    { label: "VISITS", value: String(data.counts.visit) },
    { label: "CALLS", value: String(data.counts.call) },
    { label: "EMAILS", value: String(data.counts.email) },
    { label: "QUOTES / SPECS", value: `${data.quotes.length}${data.quoteTotal ? `  ${fmtMoney(data.quoteTotal)}` : ""}` },
  ]);

  if (data.activity.length === 0 && data.quotes.length === 0) {
    L.gap(4);
    L.text("Nothing logged today yet.", { size: 11 });
  } else {
    if (data.activity.length > 0) {
      L.sectionHeading(`Activity (${data.activity.length})`);
      renderActivity(L, data.activity);
    }
    if (data.quotes.length > 0) {
      L.sectionHeading(`Quotes & Specs (${data.quotes.length})`);
      renderQuotes(L, data.quotes);
    }
  }

  const bytes = await doc.save();
  const filename = `daily-activity-${today}.pdf`;
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
