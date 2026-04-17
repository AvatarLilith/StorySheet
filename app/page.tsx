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

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const STORY_STEPS = [3, 4, 5, 6, 7, 8, 9, 10];
const MESSAGES = ["give me 8 pls :)", "hey!", "I said 8 pls", "where are you going?", "somebody doesn't know how to listen to directions", "stubborn, aren't you…"];
const NO_UI = [-1, 0, 1, 2];

const BlackBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button onClick={onClick} style={{
    background: "#111", color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 24px", fontSize: 15,
    fontFamily: FONT, cursor: "pointer", fontWeight: 500,
  }}>{label}</button>
);

function Shell({ step, onLeft, onRight, onClose, children }: {
  step: number;
  onLeft: () => void;
  onRight: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const inStory = STORY_STEPS.includes(step);
  const storyIndex = STORY_STEPS.indexOf(step);
  const showUI = !NO_UI.includes(step);
  const [showPopup, setShowPopup] = useState(false);

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ url: window.location.href });
    } else {
      window.open(window.location.href);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 390 }}>
      {/* Phone frame */}
      <div style={{
        width: "100%",
        height: 690,
        border: showUI ? "1px solid #ccc" : "none",
        borderRadius: showUI ? 3 : 0,
        background: showUI ? "#fff" : "transparent",
        overflow: "hidden", display: "flex", flexDirection: "column", position: "relative",
        fontFamily: FONT,
      }}>
        {inStory && (
          <div style={{ display: "flex", gap: 3, padding: "10px 10px 0", flexShrink: 0 }}>
            {STORY_STEPS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 2, borderRadius: 999, background: i <= storyIndex ? "#000" : "#ddd" }} />
            ))}
          </div>
        )}

        {showUI && (
          <div style={{ display: "flex", alignItems: "center", padding: "12px 16px 10px", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#ccc", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT }}>Close Friends Only</div>
              <div style={{ fontSize: 12, color: "#555", fontFamily: FONT }}>An Epistolary Exchange</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => setShowPopup(p => !p)}
                  style={{ padding: "5px 12px", borderRadius: 999, background: "#00e676", fontSize: 14, fontWeight: 700, fontFamily: FONT, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                  ✉ <span style={{ fontSize: 11 }}>▾</span>
                </div>
                {showPopup && (
                  <div style={{ position: "absolute", right: 0, top: 40, background: "#fff", border: "1px solid #eee", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontFamily: FONT, whiteSpace: "nowrap", zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                    close friends only
                  </div>
                )}
              </div>
              <div onClick={onClose} style={{ fontSize: 28, fontWeight: 300, color: "#111", fontFamily: FONT, lineHeight: 1, cursor: "pointer" }}>×</div>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", position: "relative", padding: showUI ? "12px 20px" : "0" }}>
          {children}
          {inStory && (
            <>
              <div onClick={onLeft} style={{ position: "absolute", left: 0, top: 0, width: "35%", height: "100%", cursor: "pointer", zIndex: 10 }} />
              <div onClick={onRight} style={{ position: "absolute", right: 0, top: 0, width: "35%", height: "100%", cursor: "pointer", zIndex: 10 }} />
            </>
          )}
        </div>
      </div>

      {/* Bottom bar — outside the frame */}
      {showUI && (
        <div style={{ display: "flex", justifyContent: "center", gap: 40, padding: "16px 0 0", fontSize: 12, fontFamily: FONT, color: "#222", width: "100%" }}>
          <div style={{ textAlign: "center", cursor: "pointer" }} onClick={handleShare}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>⤴</div>
            Share
          </div>
          <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => window.open("mailto:audiovisual.lilith@gmail.com")}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#111", margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 14 }}>✉</span>
            </div>
            Email Me
          </div>
          <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => window.open("https://avatarlilith.com")}>
            <div style={{ fontSize: 24, marginBottom: 4, letterSpacing: 2 }}>•••</div>
            More
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [letter, setLetter] = useState("");
  const [status, setStatus] = useState("");
  const [uploadError, setUploadError] = useState(false);
  const [uploadAttempts, setUploadAttempts] = useState(0);

  const helper = useMemo(() => {
    if (!files.length) return "Choose 8 screenshots.";
    if (files.length < 8) return `Add ${8 - files.length} more.`;
    return "";
  }, [files.length]);

  function reset() { setStep(0); setFiles([]); setLetter(""); setStatus(""); setUploadError(false); setUploadAttempts(0); }

  function onLeft() {
    const i = STORY_STEPS.indexOf(step);
    if (i > 0) setStep(STORY_STEPS[i - 1]);
  }

  function onRight() {
    const i = STORY_STEPS.indexOf(step);
    if (step === 6 && files.length < 8) {
      setUploadError(true);
      setUploadAttempts(a => a + 1);
      return;
    }
    setUploadError(false);
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
    setStep(9);
  }

  const p: React.CSSProperties = { fontSize: 17, lineHeight: 1.9, marginBottom: 14, fontWeight: 400, fontFamily: FONT };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "20px", fontFamily: FONT, background: "transparent" }}>
      <Shell step={step} onLeft={onLeft} onRight={onRight} onClose={() => setStep(2)}>

        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <img src="/youre-invited.jpg" alt="You're invited" style={{ width: "80%", height: "auto", marginBottom: 20 }} />
            <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
              <button onClick={() => setStep(1)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
                <img src="/y.jpg" alt="Y" style={{ height: 44, width: "auto" }} />
              </button>
              <button onClick={() => setStep(-1)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
                <img src="/n.jpg" alt="N" style={{ height: 44, width: "auto" }} />
              </button>
            </div>
          </div>
        )}

        {step === -1 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontStyle: "italic", marginBottom: 36 }}>see you later</div>
            <button onClick={reset} style={{ border: "none", background: "transparent", fontSize: 14, cursor: "pointer", textDecoration: "underline", fontFamily: FONT }}>
              begin again
            </button>
          </div>
        )}

        {step === 1 && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "24px" }}>
            <div style={{ marginBottom: 8 }}>
              <img src="/logo.jpg" alt="Close Friends Only" style={{ height: 60, width: "auto" }} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <p style={{ marginBottom: 20, fontWeight: 700, fontSize: 18 }}>Tools required:</p>
              <ol style={{ paddingLeft: 24, margin: 0 }}>
                <li style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>A printer</li>
                <li style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Instagram</li>
                <li style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>An envelope</li>
                <li style={{ fontSize: 18, fontWeight: 700 }}>A stamp</li>
              </ol>
            </div>
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 16 }}>
              <BlackBtn onClick={() => setStep(2)} label="Begin" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <button onClick={() => setStep(3)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#ccc", outline: "3px solid #00e676", outlineOffset: 3 }} />
            </button>
          </div>
        )}

        {step === 3 && (
          <div style={{ paddingTop: 24 }}>
            <p style={p}>Dear Close Friend,</p>
            <p style={p}>I hope this letter finds you well.</p>
            <p style={p}>There are birds outside my window and the sky is grey.</p>
            <p style={{ ...p, marginBottom: 0 }}>I miss you…</p>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
            <p style={{ ...p, marginBottom: 0 }}>I want you to do something for me.</p>
          </div>
        )}

        {step === 5 && (
          <div style={{ paddingTop: 24, fontFamily: FONT, fontSize: 15, lineHeight: 1.7 }}>
            <p style={{ marginBottom: 16 }}>Set a timer for 3 minutes.</p>
            <p style={{ marginBottom: 16 }}>Open your Instagram app and go to your Archive.</p>
            <p style={{ marginBottom: 16 }}>Screenshot 8 photos that are meaningful to you.</p>
            <p style={{ marginBottom: 32 }}>Come back to this page when you're done.</p>
            <div style={{ position: "relative", zIndex: 20, display: "flex", justifyContent: "flex-end" }}>
              <BlackBtn onClick={() => setStep(6)} label="I'm done" />
            </div>
          </div>
        )}

        {step === 6 && (
          <div style={{ paddingTop: 24, fontFamily: FONT, fontSize: 15 }}>
            <p style={{ fontStyle: "italic", marginBottom: 20, fontSize: 16 }}>Add them here. Don't be shy.</p>
            <div style={{ position: "relative", zIndex: 20, marginBottom: 12 }}>
              <input type="file" accept="image/jpeg,image/png" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            </div>
            {files.length < 8 && helper && (
              <p style={{ fontSize: 12, opacity: 0.5, marginTop: 8 }}>{helper}</p>
            )}
            {uploadError && files.length < 8 && (
              <p style={{ fontSize: 12, marginTop: 8 }}>
                {MESSAGES[(uploadAttempts - 1) % MESSAGES.length]}
              </p>
            )}
            {files.length === 8 && (
              <p style={{ fontSize: 12, marginTop: 8 }}>perfect.</p>
            )}
          </div>
        )}

        {step === 7 && (
          <div style={{ paddingTop: 16, position: "relative", zIndex: 20, width: "100%" }}>
            <p style={{ fontSize: 14, marginBottom: 10 }}>Write your letter:</p>
            <textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              placeholder="Dear Close Friend…"
              rows={9}
              style={{ width: "100%", padding: 12, borderRadius: 3, border: "1px solid #ccc", fontSize: 15, fontFamily: FONT, resize: "none", boxSizing: "border-box", lineHeight: 1.7 }}
            />
          </div>
        )}

        {step === 8 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", position: "relative", zIndex: 20 }}>
            <BlackBtn onClick={generate} label="Download" />
            {status && <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>{status}</div>}
          </div>
        )}

        {step === 9 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", lineHeight: 2.2 }}>
            <p style={{ fontSize: 16 }}>Print it.</p>
            <p style={{ fontSize: 16 }}>Fold it.</p>
            <img src="/fold-guide.gif" alt="How to fold" style={{ width: 90, borderRadius: 3, border: "1px solid #ddd", margin: "12px auto" }} />
            <p style={{ fontSize: 16 }}>Mail it.</p>
            <p style={{ marginTop: 20, fontSize: 15 }}>Sincerely,</p>
            <p style={{ fontStyle: "italic", fontSize: 15 }}>Avatar Lilith</p>
          </div>
        )}

        {step === 10 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
            <p style={{ fontSize: 16, marginBottom: 32 }}>begin again</p>
            <BlackBtn onClick={reset} label="↺" />
          </div>
        )}

      </Shell>
    </main>
  );
}