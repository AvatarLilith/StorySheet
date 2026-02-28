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
  // Binary search the largest font size that fits height + width constraints.
  let lo = 8;
  let hi = 72;
  let best = 12;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const lineHeight = Math.round(mid * 1.25);
    const lines = wrapText(font, text || " ", mid, maxWidth);
    const height = lines.length * lineHeight;

    if (height <= maxHeight) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const lineHeight = Math.round(best * 1.25);
  const lines = wrapText(font, text || " ", best, maxWidth);
  return { fontSize: best, lineHeight, lines };
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
    // - Zine8:  Landscape Letter (this matches the classic cut+fold template)
    const PAGE_W = isZine ? 792 : 612; // 11" or 8.5"
    const PAGE_H = isZine ? 612 : 792; // 8.5" or 11"

    // ---- Page 1 (front) ----
    const page1 = pdf.addPage([PAGE_W, PAGE_H]);

    // Layout
    const COLS = isZine ? 4 : 3;
    const ROWS = isZine ? 2 : 4;
    const maxImages = isZine ? 8 : 12;

    const MARGIN = isZine ? 28 : 28;
    const GUTTER = isZine ? 10 : 10;

    const cellW = (PAGE_W - MARGIN * 2 - GUTTER * (COLS - 1)) / COLS;
    const cellH = (PAGE_H - MARGIN * 2 - GUTTER * (ROWS - 1)) / ROWS;

    // Take first N images
    const selected = files.slice(0, maxImages);

    // For classic mini-zine imposition (cut in middle):
    // Top row (upside down): 8,1,2,3
    // Bottom row (right side up): 7,6,5,4
    // We'll map image indices -> panel slot order.
    //
    // image i (0-based) is "page i+1" content.
    // We place it into the slot where it belongs.
    const zineSlotForPage = (pageNum: number) => {
      // returns slot index 0..7 in reading order left-to-right, top row then bottom row
      // slots: 0 1 2 3 (top), 4 5 6 7 (bottom)
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

      // Expect jpg/png (client compression sends jpeg)
      if (f.type !== "image/jpeg" && f.type !== "image/png") continue;

      const bytes = new Uint8Array(await f.arrayBuffer());
      const embedded =
        f.type === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);

      // Determine which cell this image goes into
      let cellIndex = i; // default sequential for sheet12

      if (isZine) {
        const pageNum = i + 1; // 1..8
        cellIndex = zineSlotForPage(pageNum); // 0..7
      }

      const col = cellIndex % COLS;
      const row = Math.floor(cellIndex / COLS);

      const x = MARGIN + col * (cellW + GUTTER);
      const yTop = PAGE_H - MARGIN - row * (cellH + GUTTER);
      const y = yTop - cellH;

      // Fit image to cell, no cropping
      const dims = embedded.scale(1);
      const scale = Math.min(cellW / dims.width, cellH / dims.height);

      const drawW = dims.width * scale;
      const drawH = dims.height * scale;

      // Center in the cell
      const dx = x + (cellW - drawW) / 2;
      const dy = y + (cellH - drawH) / 2;

      if (isZine && row === 0) {
        // Top row should be upside down in the classic template.
        // Rotate 180 degrees around the center of the drawn image.
        const cx = dx + drawW / 2;
        const cy = dy + drawH / 2;

        page1.drawImage(embedded, {
          x: dx,
          y: dy,
          width: drawW,
          height: drawH,
          rotate: degrees(180),
          // pdf-lib rotates around origin; to rotate around center, we shift using "translate" via x/y math.
          // Luckily, pdf-lib applies rotation about (x, y) origin; this 180° works visually if we set x/y
          // as the opposite corner:
          // We’ll instead draw using center rotation trick by shifting origin:
        });

        // The above rotate in pdf-lib rotates around the lower-left corner; for 180°, we can compensate:
        // Redraw correctly compensated:
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

      // Optional subtle frames for zine vibe
      if (isZine) {
        page1.drawRectangle({
          x,
          y,
          width: cellW,
          height: cellH,
          borderWidth: 0.5,
          borderColor: rgb(0, 0, 0),
        });
      }
    }

    // ---- Page 2 (back text) — only for Zine ----
    if (isZine && includeBackText) {
      const page2 = pdf.addPage([PAGE_W, PAGE_H]);
      const font = await pdf.embedFont(StandardFonts.Helvetica);

      const margin = 48;
      const maxWidth = PAGE_W - margin * 2;
      const maxHeight = PAGE_H - margin * 2;

      const { fontSize, lineHeight, lines } = pickFontSizeToFillPage(
        font,
        backText || "",
        maxWidth,
        maxHeight
      );

      // Center vertically so it feels “designed”
      const textBlockHeight = lines.length * lineHeight;
      let y = margin + (maxHeight - textBlockHeight) / 2 + textBlockHeight - fontSize;

      for (const line of lines) {
        page2.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
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