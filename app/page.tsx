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

const STORY_STEPS = [2, 3, 4, 5, 6, 7, 8];

function Shell({ step, onLeft, onRight, children }: {
  step: number;
  onLeft: () => void;
  onRight: () => void;
  children: React.ReactNode;
}) {
  const inStory = STORY_STEPS.includes(step);
  const storyIndex = STORY_STEPS.indexOf(step);

  return (
    <div style={{
      width: 390, height: 690, maxWidth: "100vw", maxHeight: "100vh",
      border: "1px solid #ccc", borderRadius: 3, background: "#fff",
      overflow: "hidden", display: "flex", flexDirection: "column", position: "relative",
      fontFamily: "'Times New Roman', Times, serif",
    }}>
      {inStory && (
        <div style={{ display: "flex", gap: 3, padding: "10px 10px 0", flexShrink: 0 }}>
          {STORY_STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 2, borderRadius: 999, background: i <= storyIndex ? "#000" : "#ddd" }} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px 8px", gap: 10, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#ccc", flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "system-ui" }}>Close Friends Only</div>
          <div style={{ fontSize: 11, color: "#555", fontFamily: "system-ui" }}>An Epistolary Exchange</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ padding: "4px 10px", borderRadius: 999, background: "#00e676", fontSize: 13, fontWeight: 700, fontFamily: "system-ui", display: "flex", alignItems: "center", gap: 4 }}>
            ✉ <span style={{ fontSize: 10 }}>▾</span>
          </div>
          <div style={{ fontSize: 22, color: "#111", fontFamily: "system-ui", lineHeight: 1 }}>×</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", position: "relative", padding: "12px 20px 12px" }}>
        {children}
        {inStory && (
          <>
            <div onClick={onLeft} style={{ position: "absolute", left: 0, top: 0, width: "35%", height: "100%", cursor: "pointer", zIndex: 10 }} />
            <div onClick={onRight} style={{ position: "absolute", right: 0, top: 0, width: "35%", height: "100%", cursor: "pointer", zIndex: 10 }} />
          </>
        )}
      </div>

      <div style={{ borderTop: "1px solid #eee", padding: "10px 16px", display: "flex", justifyContent: "space-around", fontSize: 11, fontFamily: "system-ui", color: "#222", flexShrink: 0 }}>
        {[["⤴", "Share"], ["●", "Email Me"], ["…", "More"]].map(([i, l]) => (
          <div key={l} style={{ textAlign: "center" }}><div style={{ fontSize: 18, marginBottom: 2 }}>{i}</div>{l}</div>
        ))}
      </div>
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

  function reset() { setStep(0); setFiles([]); setLetter(""); setStatus(""); }

  function onLeft() {
    const i = STORY_STEPS.indexOf(step);
    if (i > 0) setStep(STORY_STEPS[i - 1]);
  }

  function onRight() {
    const i = STORY_STEPS.indexOf(step);
    // on upload screen, only advance if files selected
    if (step === 5 && !files.length) return;
    if (i < STORY_STEPS.length - 1) setStep(STORY_STEPS[i + 1]);
  }

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
    setStep(8);
  }

  const p: React.CSSProperties = { fontSize: 17, lineHeight: 1.9, marginBottom: 14, fontWeight: 400 };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "20px", background: "#f0f0f0" }}>
      <Shell step={step} onLeft={onLeft} onRight={onRight}>

        {/* 0: Invited */}
        {step === 0 && (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
    <img src="/youre-invited.jpg" alt="You're invited" style={{ width: "100%", height: "auto", marginBottom: 20 }} />
    <div style={{ display: "flex", gap: 32, marginTop: 8 }}>
      <button onClick={() => setStep(1)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
        <img src="/y.jpg" alt="Yes" style={{ height: 48, width: "auto" }} />
      </button>
      <button onClick={() => setStep(-1)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
        <img src="/n.jpg" alt="No" style={{ height: 48, width: "auto" }} />
      </button>
    </div>
  </div>
)}

        {/* -1: See you later */}
        {step === -1 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontStyle: "italic", marginBottom: 36 }}>see you later</div>
            <button onClick={reset} style={{ border: "none", background: "transparent", fontSize: 14, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
              begin again
            </button>
          </div>
        )}

        {/* 1: Profile bubble */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <button onClick={() => setStep(2)} style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#ccc", outline: "3px solid #00e676", outlineOffset: 3 }} />
              <div style={{ fontSize: 13, fontFamily: "system-ui", color: "#111" }}>Avatar Lilith</div>
            </button>
          </div>
        )}

        {/* 2: Letter */}
        {step === 2 && (
          <div style={{ paddingTop: 24 }}>
            <p style={p}>Dear Close Friend,</p>
            <p style={p}>I hope this letter finds you well.</p>
            <p style={p}>There are birds outside my window and the sky is grey.</p>
            <p style={{ ...p, marginBottom: 0 }}>I miss you…</p>
          </div>
        )}

        {/* 3: Ask */}
        {step === 3 && (
          <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
            <p style={{ ...p, marginBottom: 0 }}>I want you to do something for me.</p>
          </div>
        )}

        {/* 4: Instagram task */}
        {step === 4 && (
          <div style={{ paddingTop: 24, fontFamily: "system-ui", fontSize: 15, lineHeight: 1.7 }}>
            <p style={{ marginBottom: 16 }}>Open your Instagram app and go to your Archive.</p>
            <p style={{ marginBottom: 16 }}>Screenshot 8 photos that are meaningful to you.</p>
            <p style={{ marginBottom: 32 }}>Come back to this page when you're done.</p>
            <div style={{ position: "relative", zIndex: 20 }}>
              <button onClick={() => setStep(5)} style={{ border: "none", background: "transparent", fontSize: 15, cursor: "pointer", fontStyle: "italic", fontFamily: "inherit" }}>
                I'm done
              </button>
            </div>
          </div>
        )}

        {/* 5: Upload photos — tap right to advance once files selected */}
        {step === 5 && (
          <div style={{ paddingTop: 24, fontFamily: "system-ui", fontSize: 15 }}>
            <p style={{ fontStyle: "italic", marginBottom: 20, fontFamily: "inherit", fontSize: 16 }}>Add them here. Don't be shy.</p>
            <div style={{ position: "relative", zIndex: 20, marginBottom: 12 }}>
              <input type="file" accept="image/jpeg,image/png" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            </div>
            <p style={{ fontSize: 12, opacity: 0.5, marginTop: 8 }}>{helper}</p>
          </div>
        )}

        {/* 6: Write letter — tap right to advance */}
        {step === 6 && (
          <div style={{ paddingTop: 16, position: "relative", zIndex: 20, width: "100%" }}>
            <p style={{ fontFamily: "system-ui", fontSize: 14, marginBottom: 10 }}>Write your letter:</p>
            <textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              placeholder="Dear Close Friend…"
              rows={9}
              style={{ width: "100%", padding: 12, borderRadius: 3, border: "1px solid #ccc", fontSize: 15, fontFamily: "inherit", resize: "none", boxSizing: "border-box", lineHeight: 1.7 }}
            />
          </div>
        )}

        {/* 7: Download */}
        {step === 7 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", position: "relative", zIndex: 20 }}>
            <button onClick={generate} disabled={!files.length} style={{ padding: "10px 28px", borderRadius: 3, border: "1px solid #111", background: files.length ? "#111" : "#999", color: "#fff", fontSize: 15, cursor: files.length ? "pointer" : "not-allowed", fontFamily: "system-ui" }}>
              Download
            </button>
            {status && <div style={{ marginTop: 16, fontSize: 12, fontFamily: "system-ui", opacity: 0.7 }}>{status}</div>}
          </div>
        )}

        {/* 8: Done */}
        {step === 8 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", lineHeight: 2.2 }}>
            <p style={{ fontSize: 16 }}>Print it.</p>
            <p style={{ fontSize: 16 }}>Fold it.</p>
            <img src="/fold-guide.gif" alt="How to fold" style={{ width: 90, borderRadius: 3, border: "1px solid #ddd", margin: "12px auto" }} />
            <p style={{ fontSize: 16 }}>Mail it.</p>
            <p style={{ marginTop: 20, fontSize: 15 }}>Sincerely,</p>
            <p style={{ fontStyle: "italic", fontSize: 15 }}>Avatar Lilith</p>
          </div>
        )}

      </Shell>
    </main>
  );
}