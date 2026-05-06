"use client";

import { useState } from "react";
import UploadZone from "@/components/UploadZone";
import ProcessingStatus from "@/components/ProcessingStatus";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export type Stage = "idle" | "uploading" | "translating" | "stamping" | "done" | "error";

export default function Home() {
  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleFile(file: File) {
    setFileName(file.name);
    setStage("uploading");
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setStage("translating");

      const res = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Processing failed");
      }

      setStage("stamping");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const ext = file.name.split(".").pop();
      const baseName = file.name.replace(/\.[^/.]+$/, "");

      setDownloadUrl(url);
      setDownloadName(`${baseName}_translated_ES.${ext}`);
      setStage("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStage("error");
    }
  }

  function reset() {
    setStage("idle");
    setFileName("");
    setDownloadUrl("");
    setDownloadName("");
    setErrorMsg("");
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--dark)" }}>
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          {/* Hero */}
          <div className="text-center mb-14">
            <p className="text-xs tracking-[0.4em] uppercase mb-4" style={{ color: "var(--gold-dark)" }}>
              Official Document Services
            </p>
            <h1 className="text-4xl md:text-5xl font-light mb-4 leading-tight">
              <span className="shimmer">Certified Translation</span>
            </h1>
            <div className="ornament-line my-5">
              <span className="text-xs tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                English → Spanish
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", maxWidth: 420, margin: "0 auto" }}>
              Upload your document and receive a professional translation
              with official notarial certification
            </p>
          </div>

          {/* Main card */}
          <div
            className="relative"
            style={{
              background: "var(--dark-card)",
              border: "1px solid var(--dark-border)",
            }}
          >
            <div className="corner-ornament tl" />
            <div className="corner-ornament tr" />
            <div className="corner-ornament bl" />
            <div className="corner-ornament br" />

            <div className="p-8 md:p-12">
              {(stage === "idle" || stage === "uploading") && (
                <UploadZone onFile={handleFile} disabled={stage === "uploading"} />
              )}

              {(stage === "translating" || stage === "stamping") && (
                <ProcessingStatus stage={stage} fileName={fileName} />
              )}

              {stage === "done" && (
                <DoneState
                  downloadUrl={downloadUrl}
                  downloadName={downloadName}
                  fileName={fileName}
                  onReset={reset}
                />
              )}

              {stage === "error" && (
                <ErrorState message={errorMsg} onReset={reset} />
              )}
            </div>
          </div>

          {/* Accepted formats */}
          {stage === "idle" && (
            <div className="mt-8 flex justify-center gap-8">
              {["PDF", "DOCX", "DOC"].map((ext) => (
                <div key={ext} className="text-center">
                  <div
                    className="text-xs font-mono px-3 py-1 mb-1"
                    style={{
                      border: "1px solid var(--dark-border)",
                      color: "var(--gold-dark)",
                      letterSpacing: "0.15em",
                    }}
                  >
                    .{ext}
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Accepted</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function DoneState({
  downloadUrl,
  downloadName,
  fileName,
  onReset,
}: {
  downloadUrl: string;
  downloadName: string;
  fileName: string;
  onReset: () => void;
}) {
  return (
    <div className="text-center">
      <div className="mb-8">
        <div
          className="inline-flex items-center justify-center w-16 h-16 mb-6"
          style={{ border: "1px solid var(--gold-dark)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: "var(--gold)" }}>
          Translation Complete
        </p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {fileName} has been translated and certified
        </p>
      </div>

      <div
        className="mb-8 p-4 text-left"
        style={{ background: "#0d0d15", border: "1px solid var(--dark-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
            style={{ border: "1px solid var(--gold-dark)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-mono" style={{ color: "var(--gold-light)" }}>{downloadName}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Ready for download</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <a href={downloadUrl} download={downloadName} className="btn-primary flex-1 text-center block">
          <span>Download Document</span>
        </a>
        <button
          onClick={onReset}
          className="px-6 text-xs tracking-widest uppercase"
          style={{
            border: "1px solid var(--dark-border)",
            color: "var(--text-muted)",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          New
        </button>
      </div>
    </div>
  );
}

function ErrorState({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="text-center">
      <div
        className="inline-flex items-center justify-center w-16 h-16 mb-6"
        style={{ border: "1px solid #6b2020" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c04040" strokeWidth="1.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
      <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: "#c04040" }}>
        Processing Error
      </p>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>{message}</p>
      <button onClick={onReset} className="btn-primary">
        <span>Try Again</span>
      </button>
    </div>
  );
}
