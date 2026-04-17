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
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", quality));
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 360, maxWidth: "92vw", border: "1px solid #bbb", borderRadius: 18, background: "#fff", overflow: "hidden", boxShadow: "0 1px 0 rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 10 }}>
        <div style={{ width: 18, height: 18, borderRadius: 999, background: "#000" }} />
        <div style={{ fontSize: 12, fontWeight: 600 }}>Close Friends Only</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ padding: "3px 8px", borderRadius: 999, background: "#00c853", fontSize: 12, fontWeight: 700 }}>★ ⌄</div>
          <div style={{ fontSize: 20 }}>×</div>
        </div>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
      <div style={{ borderTop: "1px solid #eee", padding: "10px 16px", display: "flex", justifyContent: "space-around", fontSize: 11 }}>
        {[["⤴", "Share"], ["●", "Email Me"], ["…", "More"]].map(([i, l]) => (
          <div key={l} style={{ textAlign: "center" }}><div style={{ fontSize: 18 }}>{i}</div>{l}</div>
        ))}
      </div>
    </div>
  );
}

function Next({ label = "Next →", italic = false, onClick }: { label?: string; italic?: boolean; onClick: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
      <button onClick={onClick} style={{ border: "none", background: "transparent", fontSize: 14, cursor: "pointer", fontStyle: italic ? "italic" : "normal" }}>
        {label}
      </button>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [letter, setLetter] = useState("");
  const [status, setStatus] = useState("");

  const helper = useMemo(() => {
    if (!files.length) return "Choose 8 screenshots.";
    if (files.length < 8) return `Add ${8 - files.length} more.`;
    if (files.length === 8) return "Perfect.";
    return "We'll use the first 8.";
  }, [files.length]);

  async function generate() {
    if (!files.length) return;
    setStatus("Compressing…");
    const form = new FormData();
    form.append("mode", "zine8");
    form.append("includeBackText", "true");
    form.append("backText", letter);
    for (const file of files.slice(0, 8)) {
      const compressed = await compressImage(file, 1200, 0.8);
      form.append("images", compressed, file.name);
    }
    setStatus("Generating PDF…");
    const res = await fetch("/api/generate", { method: "POST", body: form });
    if (!res.ok) { setStatus("Something went wrong."); return; }
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
    setStep(5);
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "start center", padding: "40px 20px", fontFamily: "Georgia, serif", background: "#f6f6f6" }}>
      <Shell>

        {step === 0 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 28, fontStyle: "italic", marginBottom: 12 }}>You're invited</div>
            <div style={{ fontSize: 24 }}>✉</div>
            <div style={{ marginTop: 20, fontSize: 15, fontStyle: "italic" }}>RSVP</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 48, marginTop: 16, fontSize: 18 }}>
              <span>Y</span><span>N</span>
            </div>
            <Next onClick={() => setStep(1)} />
          </div>
        )}

        {step === 1 && (
          <div>
            <p style={{ lineHeight: 1.8, marginBottom: 10 }}>Dear Close Friend,</p>
            <p style={{ lineHeight: 1.8, marginBottom: 10 }}>I hope this letter finds you well.</p>
            <p style={{ lineHeight: 1.8, marginBottom: 10 }}>There are birds outside my window and the sky is grey.</p>
            <p style={{ lineHeight: 1.8, marginBottom: 0 }}>I miss you…</p>
            <Next onClick={() => setStep(2)} />
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{ lineHeight: 1.8 }}>I want you to do something for me.</p>
            <Next onClick={() => setStep(3)} />
          </div>
        )}

        {step === 3 && (
          <div style={{ fontFamily: "system-ui", fontSize: 14, lineHeight: 1.7 }}>
            <p style={{ marginBottom: 12 }}>Open your Instagram app and go to your Archive.</p>
            <p style={{ marginBottom: 12 }}>Screenshot 8 photos that are meaningful to you.</p>
            <p style={{ marginBottom: 0 }}>Come back to this page when you're done.</p>
            <Next label="I'm done" italic onClick={() => setStep(4)} />
          </div>
        )}

        {step === 4 && (
          <div style={{ fontFamily: "system-ui" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <button onClick={() => setStep(3)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14 }}>← Previous</button>
              <span style={{ fontSize: 12, opacity: 0.6 }}>{helper}</span>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <input type="file" accept="image/jpeg,image/png" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
              <textarea
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                placeholder="Write your letter…"
                rows={8}
                style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #bbb", fontSize: 14, fontFamily: "Georgia, serif", resize: "none" }}
              />
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button onClick={generate} disabled={!files.length} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #111", background: files.length ? "#111" : "#888", color: "#fff", cursor: files.length ? "pointer" : "not-allowed" }}>
                  Download
                </button>
              </div>
              {status && <div style={{ textAlign: "center", fontSize: 12 }}>{status}</div>}
            </div>
          </div>
        )}

        {step === 5 && (
          <div style={{ textAlign: "center", padding: "20px 0", lineHeight: 2 }}>
            <p>Print it.</p>
            <p>Fold it.</p>
            <img src="/fold-guide.gif" alt="How to fold" style={{ width: 100, borderRadius: 8, border: "1px solid #ddd", margin: "10px auto", display: "block" }} />
            <p>Mail it.</p>
            <p style={{ marginTop: 24 }}>Sincerely,</p>
            <p style={{ fontStyle: "italic" }}>Avatar Lilith</p>
          </div>
        )}

      </Shell>
    </main>
  );
}