"use client";

import { useMemo, useState } from "react";

export default function StorySheetCore() {
  const [step, setStep] = useState<1 | 2>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [letter, setLetter] = useState("");
  const [status, setStatus] = useState("");

  const maxImages = 8;

  const helper = useMemo(() => {
    if (!files.length) return `Choose ${maxImages} screenshots.`;
    if (files.length < maxImages) return `Add ${maxImages - files.length} more.`;
    if (files.length === maxImages) return "Perfect.";
    return `You selected ${files.length}. We'll use the first ${maxImages}.`;
  }, [files.length]);

  async function generate() {
    if (!files.length) return;

    setStatus("Generating PDF…");

    try {
      const form = new FormData();
      form.append("mode", "zine8");
      form.append("includeBackText", "true");
      form.append("backText", letter);

      for (const file of files.slice(0, maxImages)) {
        form.append("images", file, file.name);
      }

      const res = await fetch("/api/generate", { method: "POST", body: form });

      if (!res.ok) {
        const text = await res.text();
        console.error(text);
        setStatus("Something went wrong.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "close-friends-zine.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("Downloaded.");
    } catch (err: any) {
      setStatus("Error: " + err.message);
    }
  }

  const PhoneFrame = ({ children }: { children: React.ReactNode }) => (
    <div style={{ width: 360, maxWidth: "92vw", border: "1px solid #bbb", borderRadius: 18, background: "#fff", overflow: "hidden", boxShadow: "0 1px 0 rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 10 }}>
        <div style={{ width: 18, height: 18, borderRadius: 999, background: "#000" }} />
        <div style={{ fontSize: 12, fontWeight: 600 }}>Close Friends Only</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "3px 8px", borderRadius: 999, background: "#00c853", color: "#000", fontSize: 12, fontWeight: 700 }}>
            ★ <span style={{ fontWeight: 700 }}>⌄</span>
          </div>
          <div style={{ fontSize: 22, lineHeight: 1 }}>×</div>
        </div>
      </div>

      <div style={{ padding: 18 }}>{children}</div>

      <div style={{ borderTop: "1px solid #eee", padding: "10px 16px", display: "flex", justifyContent: "space-around", fontSize: 11, color: "#222" }}>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 18 }}>⤴</div>Share</div>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 18 }}>●</div>Email Me</div>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 18 }}>…</div>More</div>
      </div>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "start center", padding: "40px 20px", fontFamily: "system-ui", background: "#f6f6f6" }}>
      <PhoneFrame>
        {step === 1 ? (
          <div>
            <ol style={{ paddingLeft: 18, margin: 0, lineHeight: 1.5, fontSize: 16 }}>
              <li style={{ marginBottom: 10 }}>Take <b>8 screenshots</b> from your Close Friend's Instagram Story Archive from the past month.</li>
              <li style={{ marginBottom: 10 }}>Upload the screenshots. <span style={{ fontSize: 14 }}>(Nothing is stored.)</span></li>
              <li style={{ marginBottom: 10 }}>Write your letter.</li>
              <li style={{ marginBottom: 10 }}>Fold your zine.</li>
              <li style={{ marginBottom: 10 }}>Seal it with a kiss.</li>
              <li style={{ marginBottom: 10 }}>Mail it to your Close Friend(s).</li>
              <li style={{ marginBottom: 0 }}>Send them this link so they can write you back.</li>
            </ol>

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, marginBottom: 6 }}>How to fold:</div>
                <img src="/fold-guide.gif" alt="How to fold the zine" style={{ width: 100, borderRadius: 8, border: "1px solid #ddd" }} />
              </div>
            </div>

            <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setStep(2)} style={{ border: "none", background: "transparent", fontSize: 14, cursor: "pointer", color: "#111" }}>
                Next →
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <button onClick={() => setStep(1)} style={{ border: "none", background: "transparent", fontSize: 14, cursor: "pointer", color: "#111" }}>
                ← Previous
              </button>
              <div style={{ fontSize: 12, opacity: 0.65 }}>{helper}</div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <input type="file" accept="image/jpeg,image/png" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
              </div>

              <textarea
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                placeholder="Write your letter…"
                rows={8}
                style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #bbb", fontSize: 14, resize: "none" }}
              />

              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={generate}
                  disabled={!files.length}
                  style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #111", background: files.length ? "#111" : "#888", color: "#fff", cursor: files.length ? "pointer" : "not-allowed" }}
                >
                  Download
                </button>
              </div>

              {status && <div style={{ textAlign: "center", fontSize: 12 }}>{status}</div>}
            </div>
          </div>
        )}
      </PhoneFrame>
    </main>
  );
}