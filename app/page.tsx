"use client";

import { useMemo, useState } from "react";

async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  await new Promise((res) => (img.onload = res));

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxWidth / img.width);

  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", quality));
}

type Mode = "sheet12" | "zine8";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<Mode>("sheet12");

  // Only for zine:
  const [includeBackText, setIncludeBackText] = useState(false);
  const [backText, setBackText] = useState("");

  const [status, setStatus] = useState("");

  const maxImages = mode === "zine8" ? 8 : 12;

  const helper = useMemo(() => {
    if (!files.length) return `Pick up to ${maxImages} photos.`;
    if (files.length < maxImages) return `Add ${maxImages - files.length} more (or generate anyway).`;
    if (files.length === maxImages) return "Perfect. Generate the PDF.";
    return `You selected ${files.length}. We’ll use the first ${maxImages}.`;
  }, [files.length, maxImages]);

  async function generate() {
    if (!files.length) return;

    setStatus("Compressing images…");

    const form = new FormData();
    form.append("mode", mode);

    if (mode === "zine8") {
      form.append("includeBackText", includeBackText ? "true" : "false");
      form.append("backText", backText);
    } else {
      form.append("includeBackText", "false");
      form.append("backText", "");
    }

    const selected = files.slice(0, maxImages);
    for (const file of selected) {
      const compressed = await compressImage(file, 1200, 0.8);
      form.append("images", compressed);
    }

    setStatus("Generating PDF…");

    const res = await fetch("/api/generate", { method: "POST", body: form });

    if (!res.ok) {
      const text = await res.text();
      console.log(text);
      setStatus("Something went wrong.");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = mode === "zine8" ? "zine.pdf" : "storysheet.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    setStatus("Downloaded.");
  }

  return (
    <main style={{ maxWidth: 760, margin: "60px auto", padding: 20, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 6 }}>StorySheet</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Single Page (12-up) or Mini-Zine (cut & fold).
      </p>

      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 14 }}>
        <div style={{ marginBottom: 16 }}>
          <strong>Format</strong>
          <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="radio"
                name="mode"
                checked={mode === "sheet12"}
                onChange={() => {
                  setMode("sheet12");
                  setIncludeBackText(false);
                  setBackText("");
                }}
              />
              Single Page (12-up)
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="radio"
                name="mode"
                checked={mode === "zine8"}
                onChange={() => setMode("zine8")}
              />
              Zine (8-panel cut & fold)
            </label>
          </div>

          {mode === "zine8" && (
            <p style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
              Prints <b>landscape</b>. Fold in half, cut the center slit, then fold into a booklet.
            </p>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <strong>Photos</strong>
          <div style={{ marginTop: 8 }}>
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            <p style={{ margin: "8px 0 0", opacity: 0.8 }}>{helper}</p>
          </div>
        </div>

        {mode === "zine8" && (
          <div style={{ marginBottom: 16 }}>
            <strong>Back of Zine (optional)</strong>
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={includeBackText}
                  onChange={(e) => setIncludeBackText(e.target.checked)}
                />
                Add a back text page (auto-fills the page)
              </label>

              {includeBackText && (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    value={backText}
                    onChange={(e) => setBackText(e.target.value)}
                    rows={9}
                    placeholder="Write the back-page text here…"
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #ddd",
                    }}
                  />
                  <p style={{ margin: "8px 0 0", opacity: 0.7, fontSize: 13 }}>
                    Print <b>double-sided</b> to put this on the back of the zine sheet.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

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

        {status && <p style={{ marginTop: 12 }}>{status}</p>}
      </div>

      <p style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>
        Privacy: images are compressed in your browser and not stored by the app.
      </p>
    </main>
  );
}