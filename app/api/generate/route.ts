import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("images") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No images uploaded." }, { status: 400 });
    }

    // One-page sheet: take first 12 images
    const selected = files.slice(0, 12);

    const pdf = await PDFDocument.create();

    // US Letter size in points
    const PAGE_W = 612; // 8.5 * 72
    const PAGE_H = 792; // 11 * 72

    // 12-up grid: 3 columns x 4 rows (biggest tiles for 12)
    const COLS = 4;
    const ROWS = 3;

    // Slightly tighter margins for more image area
    const MARGIN = 28;
    const GUTTER = 10;

    const cellW = (PAGE_W - MARGIN * 2 - GUTTER * (COLS - 1)) / COLS;
    const cellH = (PAGE_H - MARGIN * 2 - GUTTER * (ROWS - 1)) / ROWS;

    const page = pdf.addPage([PAGE_W, PAGE_H]);

    for (let i = 0; i < selected.length; i++) {
      const f = selected[i];

      // Keep MVP reliable: only jpg/png
      if (f.type !== "image/jpeg" && f.type !== "image/png") continue;

      const bytes = new Uint8Array(await f.arrayBuffer());

      const embedded =
        f.type === "image/png"
          ? await pdf.embedPng(bytes)
          : await pdf.embedJpg(bytes);

      const col = i % COLS;
      const row = Math.floor(i / COLS);

      const x = MARGIN + col * (cellW + GUTTER);
      const yTop = PAGE_H - MARGIN - row * (cellH + GUTTER);
      const y = yTop - cellH;

      // FIT: show whole image, no cropping
      const dims = embedded.scale(1);
      const scale = Math.min(cellW / dims.width, cellH / dims.height);

      const drawW = dims.width * scale;
      const drawH = dims.height * scale;

      const dx = x + (cellW - drawW) / 2;
      const dy = y + (cellH - drawH) / 2;

      page.drawImage(embedded, { x: dx, y: dy, width: drawW, height: drawH });

      // Optional subtle border (uncomment if you want frames)
      // page.drawRectangle({
      //   x,
      //   y,
      //   width: cellW,
      //   height: cellH,
      //   borderWidth: 0.5,
      // });
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
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}