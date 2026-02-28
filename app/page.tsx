"use client";

import { useMemo, useState } from "react";

async function compressImage(file: File): Promise<Blob> {
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  await new Promise((res) => (img.onload = res));

  const canvas = document.createElement("canvas");

  const maxWidth = 1200; // resize large stories down
  const scale = Math.min(1, maxWidth / img.width);

  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((res) =>
    canvas.toBlob((blob) => res(blob!), "image/jpeg", 0.8)
  );
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");

  const helper = useMemo(() => {
    if (!files.length) return "Pick up to 12 photos.";
    if (files.length < 12) return `Add ${12 - files.length} more (or generate anyway).`;
    if (files.length === 12) return "Perfect. Generate the PDF.";
    return `You selected ${files.length}. We’ll use the first 12.`;
  }, [files.length]);

  async function generate() {
    if (!files.length) return;
    setStatus("Compressing images…");

    const form = new FormData();

    for (const file of files.slice(0, 12)) {
      const compressed = await compressImage(file);
      form.append("images", compressed);
    }

    setStatus("Generating PDF…");

    const res = await fetch("/api/generate", {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      console.log(text);
      setStatus("Upload too large or server error.");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "storysheet.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    setStatus("Downloaded storysheet.pdf");
  }

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", padding: 20 }}>
      <h1>StorySheet</h1>
      <p>Upload photos → download a one-page printable PDF.</p>

      <input
        type="file"
        accept="image/jpeg,image/png"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
      />

      <br /><br />

      <button onClick={generate} disabled={!files.length}>
        Generate PDF
      </button>

      <p>{status}</p>

      <p style={{ fontSize: 13, opacity: 0.7 }}>
        Images are compressed in-browser and not stored.
      </p>
    </main>
  );
}