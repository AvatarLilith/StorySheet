"use client";
import { useState } from "react";

const API = "https://storysheet.vercel.app/api/generate";

export default function Home() {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [letter, setLetter] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(e.target.files ?? []).slice(0, 8));
  }

  async function generate() {
    if (!files.length) return;
    setLoading(true);
    setStatus("Building your zine…");
    try {
      const form = new FormData();
      form.append("mode", "zine8");
      form.append("includeBackText", "true");
      form.append("backText", letter);
      for (const file of files.slice(0, 8)) form.append("images", file, file.name);
      const res = await fetch(API, { method: "POST", body: form });
      if (!res.ok) throw new Error("Server error: " + res.status);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "close-friends-zine.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("Downloaded!");
      setStep(5);
    } catch (err: any) {
      setStatus("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const Next = ({ to, label = "Next →", italic = false }: { to: number; label?: string; italic?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
      <button onClick={() => setStep(to)} style={{ border: "none", background: "transparent", fontSize: 14, cursor: "pointer", fontFamily: "system-ui", fontStyle: italic ? "italic" : "normal" }}>
        {label}
      </button>
    </div>
  );

  const screens: Record<number, React.ReactNode> = {
    0: (
      <div>
        <div style={{ textAlign: "center", margin: "20px 0 28px" }}>
          <div style={{ fontSize: 28, fontStyle: "italic", marginBottom: 8 }}>You&apos;re invited</div>
          <div style={{ fontSize: 22 }}>✉</div>
          <div style={{ marginTop: 16, fontSize: 15, fontStyle: "italic" }}>RSVP</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 48, marginTop: 14, fontSize: 18 }}>
            <span>Y</span><span>N</span>
          </div>
        </div>
        <Next to={1} />
      </div>
    ),
    1: (
      <div>
        <p>Dear Close Friend,</p>
        <p>I hope this letter finds you well.</p>
        <p>There are birds outside my window and the sky is grey.</p>
        <p>I miss you…</p>
        <Next to={2} />
      </div>
    ),
    2: (
      <div>
        <p>I want you to do something for me.</p>
        <Next to={3} />
      </div>
    ),
    3: (
      <div>
        <p style={{ fontFamily: "system-ui", fontSize: 14 }}>Open your Instagram app and go to your Archive.</p>
        <p style={{ fontFamily: "system-ui", fontSize: 14 }}>Screenshot 8 photos that are meaningful to you.</p>
        <p style={{ fontFamily: "system-ui", fontSize: 14 }}>Come back to this page when you&apos;re done.</p>
        <Next to={4} label="I'm done" italic />
      </div>
    ),
    4: (
      <div>
        <p style={{ fontFamily: "system-ui", fontSize: 14, fontStyle: "italic" }}>Add them here. Don&apos;t be shy.</p>
        <input type="file" accept="image/jpeg,image/png" multiple onChange={pickFiles} style={{ fontSize: 13, fontFamily: "system-ui", display: "block", marginBottom: 4 }} />
        {files.length > 0 && <p style={{ fontFamily: "system-ui", fontSize: 12, color: "#666", marginBottom: 12 }}>{files.length}/8 photos selected</p>}
        <p style={{ fontFamily: "system-ui", fontSize: 14, margin: "10px 0 4px" }}>Write your letter:</p>
        <textarea value={letter} onChange={e => setLetter(e.target.value)} rows={7} placeholder="Dear Close Friend…" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", fontSize: 13, fontFamily: "Georgia, serif", resize: "none", boxSizing: "border-box", margin: "6px 0 14px", display: "block" }} />
        <button onClick={generate} disabled={!files.length || loading} style={{ display: "block", margin: "0 auto 8px", padding: "8px 24px", borderRadius: 8, border: "1px solid #111", background: files.length && !loading ? "#111" : "#999", color: "#fff", fontSize: 14, cursor: files.length && !loading ? "pointer" : "not-allowed", fontFamily: "system-ui" }}>
          {loading ? "Building your zine…" : "Download"}
        </button>
        {status && !loading && <p style={{ textAlign: "center", fontSize: 12, color: "#555", fontFamily: "system-ui" }}>{status}</p>}
      </div>
    ),
    5: (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <p>Print it.</p>
        <p>Fold it.</p>
        <div style={{ width: 120, height: 80, background: "#e8e0d5", borderRadius: 6, margin: "10px auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#888", fontFamily: "system-ui" }}>your zine</div>
        <p>Mail it.</p>
        <p style={{ marginTop: 16 }}>Sincerely,</p>
        <p style={{ fontStyle: "italic" }}>Avatar Lilith</p>
      </div>
    ),
  };

  return (
    <main style={{ background: "#f6f6f6", minHeight: "100vh", display: "flex", justifyContent: "center", padding: "40px 16px", fontFamily: "Georgia, serif" }}>
      <div style={{ width: 340, maxWidth: "96vw", background: "#fff", borderRadius: 32, border: "1px solid #d0d0d0", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px 10px", gap: 8, borderBottom: "1px solid #eee" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#ccc", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "system-ui" }}>Close Friends Only</div>
            <div style={{ fontSize: 10, color: "#888", fontFamily: "system-ui" }}>An Epistolary Exchange</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ background: "#00e676", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700, fontFamily: "system-ui" }}>★ ▾</div>
            <span style={{ fontSize: 18, color: "#555" }}>×</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 20, minHeight: 260 }}>
          {screens[step]}
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid #eee", padding: "10px 0", display: "flex", justifyContent: "space-around", fontFamily: "system-ui", fontSize: 10, color: "#333" }}>
          {[["⤴", "Share"], ["●", "Email Me"], ["…", "More"]].map(([icon, label]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{icon}</div>
              {label}
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}