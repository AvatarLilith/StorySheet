"use client";

import { useMemo, useState } from "react";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");

  const helper = useMemo(() => {
    if (!files.length) return "Pick up to 12 photos for the best one-page sheet.";
    if (files.length < 12) return `Add ${12 - files.length} more (or generate anyway).`;
    if (files.length === 12) return "Perfect. Generate the PDF.";
    return `You selected ${files.length}. We’ll use the first 12.`;
  }, [files.length]);

  async function generate() {
    if (!files.length) return;
    setStatus("Generating PDF…");

    const form = new FormData();
    files.slice(0, 12).forEach((f) => form.append("images", f));

    const res = await fetch("/api/generate", { method: "POST", body: form });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data?.error ?? "Something went wrong.");
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
    <main
      style={{
        maxWidth: 720,
        margin: "60px auto",
        padding: 20,
        fontFamily: "system-ui",
      }}
    >
      <h1 style={{ marginBottom: 6 }}>StorySheet</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Upload photos → download a one-page printable PDF (12-up, no cropping).
      </p>

      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 14 }}>
        <input
          type="file"
          accept="image/jpeg,image/png"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />

        <p style={{ margin: "10px 0 0", opacity: 0.8 }}>{helper}</p>

        <div style={{ marginTop: 12 }}>
          <button
            onClick={generate}
            disabled={!files.length}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: files.length ? "#111" : "#888",
              color: "#fff",
              cursor: files.length ? "pointer" : "not-allowed",
            }}
          >
            Generate PDF
          </button>
        </div>

        {status && <p style={{ marginTop: 12 }}>{status}</p>}
      </div>

      <p style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>
        Privacy: images are processed to create the PDF and aren’t stored.
      </p>
    </main>
  );
}