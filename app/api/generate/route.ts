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
    if (width <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function pickFontSizeToFillPage(font: any, text: string, maxWidth: number, maxHeight: number) {
  let lo = 8;
  let hi = 140;
  let best = 12;

  const safeText = (text || "").trim() || " ";

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const lineHeight = Math.round(mid * 1.22);
    const lines = wrapText(font, safeText, mid, maxWidth);
    const height = lines.length * lineHeight;

    if (height <= maxHeight) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const lineHeight = Math.round(best * 1.22);
  const lines = wrapText(font, safeText, best, maxWidth);
  return { fontSize: best, lineHeight, lines };
}

/**
 * Draws a text label inside a panel, with a white background strip.
 * If rotate180 is true, rotates the label 180° (so it reads correctly after folding).
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
  rotate180: boolean;
}) {
  const { page, text, font, fontSize, panelX, panelY, panelW, panelH, anchor, rotate180 } = opts;

  const padX = 6;
  const padY = 3;

  const textW = font.widthOfTextAtSize(text, fontSize);
  const textH = fontSize;

  // Center horizontally in the panel
  const tx = panelX + panelW / 2 - textW / 2;

  // Position vertically inside the panel
  // "top" means around the first quarter down from the top (your request)
  // "bottom" means near the bottom
  const ty =
    anchor === "top"
      ? panelY + panelH * 0.72 // roughly "first quarter of vertical" (high on the panel)
      : panelY + 8;

  // Background strip
  const rectW = textW + padX * 2;
  const rectH = textH + padY * 2;
  const rx = tx - padX;
  const ry = ty - padY;

  if (rotate180) {
    // Rotate around lower-left corner compensation: draw at (x+w, y+h) with rotate 180
    page.drawRectangle({
      x: rx + rectW,
      y: ry + rectH,
      width: rectW,
      height: rectH,
      rotate: degrees(180),
      color: rgb(1, 1, 1),
    });

    page.drawText(text, {
      x: tx + textW,
      y: ty + textH,
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
      x: tx,
      y: ty,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    // "sheet12" | "zine8"
    const mode = asString(form.get("mode")) || "sheet12";

    // Only used when mode === "zine8"
    const includeBackText = asString(form.get("includeBackText")) === "true";
    const backText = asString(form.get("backText"));

    const files = form.getAll("images") as File[];
    if (!files.length) {
      return NextResponse.json({ error: "No images uploaded." }, { status: 400 });
    }

    const pdf = await PDFDocument.create();
    const isZine = mode === "zine8";

    // Page size:
    // - Sheet12: Portrait Letter
    // - Zine8: Landscape Letter (classic cut+fold template)
    const PAGE_W = isZine ? 792 : 612;
    const PAGE_H = isZine ? 612 : 792;

    // ---- Page 1 (front sheet) ----
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

    // Fonts for panel overlays (zine only)
    const coverFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const footerFont = await pdf.embedFont(StandardFonts.HelveticaOblique);

    // Classic mini-zine imposition:
    // Top row (upside down): 8,1,2,3
    // Bottom row: 7,6,5,4
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

    for (let i = 0; i < selected.length; i++) {
      const f = selected[i];
      if (f.type !== "image/jpeg" && f.type !== "image/png") continue;

      const bytes = new Uint8Array(await f.arrayBuffer());
      const embedded =
        f.type === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);

      const pageNum = i + 1;

      // Determine which panel slot this page goes into
      let cellIndex = i;
      if (isZine) cellIndex = zineSlotForPage(pageNum);

      const col = cellIndex % COLS;
      const row = Math.floor(cellIndex / COLS);

      const panelX = MARGIN_OTHER + col * (cellW + GUTTER);
      const yTop = PAGE_H - MARGIN_TOP - row * (cellH + GUTTER);
      const panelY = yTop - cellH;

      // Fit image to panel, no cropping
      const dims = embedded.scale(1);
      const scale = Math.min(cellW / dims.width, cellH / dims.height);

      const drawW = dims.width * scale;
      const drawH = dims.height * scale;

      const dx = panelX + (cellW - drawW) / 2;
      const dy = panelY + (cellH - drawH) / 2;

      const topRowRotated = isZine && row === 0;

      // Draw image (rotate top row)
      if (topRowRotated) {
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

      // ---- Put text on the MINI-PAGES (page 1 and page 8 of the zine) ----
      if (isZine && pageNum === 1) {
        drawPanelLabel({
          page: page1,
          text: "Close Friends Only",
          font: coverFont,
          fontSize: 10,
          panelX,
          panelY,
          panelW: cellW,
          panelH: cellH,
          anchor: "top",
          rotate180: topRowRotated, // rotate if panel is in rotated row
        });
      }

      if (isZine && pageNum === 8) {
        drawPanelLabel({
          page: page1,
          text: "Open the zine to read the letter.",
          font: footerFont,
          fontSize: 7,
          panelX,
          panelY,
          panelW: cellW,
          panelH: cellH,
          anchor: "bottom",
          rotate180: topRowRotated, // rotate if panel is in rotated row
        });
      }
    }

    // ---- Optional Page 2 (back letter page) — only for Zine ----
    if (isZine && includeBackText) {
      const page2 = pdf.addPage([PAGE_W, PAGE_H]);
      const font = await pdf.embedFont(StandardFonts.Helvetica);

      const margin = 32;
      const maxWidth = PAGE_W - margin * 2;
      const maxHeight = PAGE_H - margin * 2;

      const { fontSize, lineHeight, lines } = pickFontSizeToFillPage(
        font,
        backText || "",
        maxWidth,
        maxHeight
      );

      const textBlockHeight = lines.length * lineHeight;
      let y = margin + (maxHeight - textBlockHeight) / 2 + textBlockHeight - fontSize;

      for (const line of lines) {
        page2.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= lineHeight;
      }
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