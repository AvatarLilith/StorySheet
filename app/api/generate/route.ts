import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

export const runtime = "nodejs";

function asString(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v : "";
}

function wrapText(font: any, text: string, fontSize: number, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function pickFontSizeToFillPage(font: any, text: string, maxWidth: number, maxHeight: number) {
  const safeText = (text || "").trim() || " ";

  let lo = 6;
  let hi = 160;
  let best = 12;

  const measure = (size: number) => {
    const leading = size * 1.25; // a bit more generous so we never clip descenders
    const lines = wrapText(font, safeText, size, maxWidth);
    const height = lines.length * leading;
    return { lines, height, leading };
  };

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const { height } = measure(mid);

    if (height <= maxHeight) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const { lines, leading } = measure(best);
  return { fontSize: best, leading, lines };
}

/**
 * Draw a label inside a panel with a white strip behind it.
 * If panelIsRotated is true (top row), we:
 *  - mirror the placement inside the panel (so "top" remains top after 180°)
 *  - rotate the label 180° to match the panel rotation
 */
function drawPanelLabel(opts: {
  page: any;
  text: string;
  font: any;
  fontSize: number;
  panelX: number;
  panelY: number;
  panelW: number;
  panelH: number;
  anchor: "top" | "bottom";
  panelIsRotated: boolean;
}) {
  const { page, text, font, fontSize, panelX, panelY, panelW, panelH, anchor, panelIsRotated } =
    opts;

  const padX = 6;
  const padY = 3;

  const textW = font.widthOfTextAtSize(text, fontSize);
  const textH = fontSize;

  // Base placement (for NON-rotated panels)
  const tx = panelX + panelW / 2 - textW / 2;

  // Your requested vertical intent:
  // - "top" = around first quarter down (high)
  // - "bottom" = near bottom
  const ty = anchor === "top" ? panelY + panelH * 0.80 : panelY + 10;

  const rectW = textW + padX * 2;
  const rectH = textH + padY * 2;

  let rx = tx - padX;
  let ry = ty - padY;

  // If the panel is rotated 180° on the sheet (top row),
  // mirror the label's position inside the panel so it ends up
  // in the intended spot on the folded page.
  if (panelIsRotated) {
    rx = panelX + (panelW - (rx - panelX) - rectW);
    ry = panelY + (panelH - (ry - panelY) - rectH);
  }

  if (panelIsRotated) {
    // Draw rotated-in-place (same bounding box, just rotated)
    page.drawRectangle({
      x: rx + rectW,
      y: ry + rectH,
      width: rectW,
      height: rectH,
      rotate: degrees(180),
      color: rgb(1, 1, 1),
    });

    page.drawText(text, {
      x: rx + padX + textW,
      y: ry + padY + textH,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
      rotate: degrees(180),
    });
  } else {
    page.drawRectangle({
      x: rx,
      y: ry,
      width: rectW,
      height: rectH,
      color: rgb(1, 1, 1),
    });

    page.drawText(text, {
      x: rx + padX,
      y: ry + padY,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const mode = asString(form.get("mode")) || "sheet12";

    // Only for zine mode
    const includeBackText = asString(form.get("includeBackText")) === "true";
    const backText = asString(form.get("backText"));

    const files = form.getAll("images") as File[];
    if (!files.length) {
      return NextResponse.json({ error: "No images uploaded." }, { status: 400 });
    }

    const pdf = await PDFDocument.create();
    const isZine = mode === "zine8";

    // Letter sizes:
    // sheet12: portrait
    // zine8: landscape (classic fold/cut)
    const PAGE_W = isZine ? 792 : 612;
    const PAGE_H = isZine ? 612 : 792;

    // ---------------- PAGE 1: images ----------------
    const page1 = pdf.addPage([PAGE_W, PAGE_H]);

    const COLS = isZine ? 4 : 3;
    const ROWS = isZine ? 2 : 4;
    const maxImages = isZine ? 8 : 12;

    const MARGIN_TOP = 28;
    const MARGIN_OTHER = 28;
    const GUTTER = 10;

    const cellW = (PAGE_W - MARGIN_OTHER * 2 - GUTTER * (COLS - 1)) / COLS;
    const cellH = (PAGE_H - MARGIN_TOP - MARGIN_OTHER - GUTTER * (ROWS - 1)) / ROWS;

    const selected = files.slice(0, maxImages);

    const coverFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const footerFont = await pdf.embedFont(StandardFonts.HelveticaOblique);

    // Classic mini-zine imposition:
    // Top row (upside down): 8,1,2,3
    // Bottom row:            7,6,5,4
    const zineSlotForPage = (pageNum: number) => {
      const map: Record<number, number> = {
        8: 0,
        1: 1,
        2: 2,
        3: 3,
        7: 4,
        6: 5,
        5: 6,
        4: 7,
      };
      return map[pageNum];
    };

    // -------- IMAGE LOOP --------
    for (let i = 0; i < selected.length; i++) {
      const f = selected[i];
      if (f.type !== "image/jpeg" && f.type !== "image/png") continue;

      const bytes = new Uint8Array(await f.arrayBuffer());
      const embedded =
        f.type === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);

      const pageNum = i + 1; // zine page number 1..8 (or 1..12 in sheet mode)

      // Which cell does this image go to?
      let cellIndex = i;
      if (isZine) cellIndex = zineSlotForPage(pageNum);

      const col = cellIndex % COLS;
      const row = Math.floor(cellIndex / COLS);

      const panelX = MARGIN_OTHER + col * (cellW + GUTTER);
      const yTop = PAGE_H - MARGIN_TOP - row * (cellH + GUTTER);
      const panelY = yTop - cellH;

      // Fit image (no cropping)
      const dims = embedded.scale(1);
      const scale = Math.min(cellW / dims.width, cellH / dims.height);
      const drawW = dims.width * scale;
      const drawH = dims.height * scale;

      const dx = panelX + (cellW - drawW) / 2;
      const dy = panelY + (cellH - drawH) / 2;

      const panelIsRotated = isZine && row === 0;

      // Draw image (rotate top row for zine template)
      if (panelIsRotated) {
        page1.drawImage(embedded, {
          x: dx + drawW,
          y: dy + drawH,
          width: drawW,
          height: drawH,
          rotate: degrees(180),
        });
      } else {
        page1.drawImage(embedded, { x: dx, y: dy, width: drawW, height: drawH });
      }

      // ---- ZINE TEXT (correct pages) ----
      // Front cover is page 8
      if (isZine && pageNum === 8) {
        drawPanelLabel({
          page: page1,
          text: "Close Friends Only",
          font: coverFont,
          fontSize: 15,
          panelX,
          panelY,
          panelW: cellW,
          panelH: cellH,
          anchor: "top",
          panelIsRotated,
        });
      }

      // Back cover is page 1
      if (isZine && pageNum === 1) {
        drawPanelLabel({
          page: page1,
          text: "Unfold the zine to read the letter.",
          font: footerFont,
          fontSize: 7,
          panelX,
          panelY,
          panelW: cellW,
          panelH: cellH,
          anchor: "bottom",
          panelIsRotated,
        });
      }
    }

  // ---------------- PAGE 2: optional letter (duplex back) ----------------
// Draw normally so fitting is correct, then rotate the whole page 180°.
if (isZine && includeBackText) {
  const page2 = pdf.addPage([PAGE_W, PAGE_H]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const margin = 32;
  const maxWidth = PAGE_W - margin * 2;
  const maxHeight = PAGE_H - margin * 2;

  const { fontSize, leading, lines } = pickFontSizeToFillPage(
    font,
    backText || "",
    maxWidth,
    maxHeight
  );

  // Start at top margin and flow downward
  let y = PAGE_H - margin - fontSize;

  for (const line of lines) {
    page2.drawText(line, {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
    y -= leading;
  }

  // Rotate the entire page for duplex landscape printing
  page2.setRotation(degrees(180));
}

    const pdfBytes = await pdf.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="storysheet.pdf"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}