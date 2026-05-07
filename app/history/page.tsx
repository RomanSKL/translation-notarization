"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Translation {
  _id: string;
  jobId: string;
  fileName: string;
  fileType: string;
  translatedAt: string;
}

export default function HistoryPage() {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => {
        setTranslations(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function downloadName(fileName: string) {
    return fileName.replace(/\.[^/.]+$/, "") + "_translated_ES.pdf";
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--dark)" }}>
      <Header />

      <main className="flex-1 px-4 py-14">
        <div className="max-w-2xl mx-auto">

          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.4em] uppercase mb-3" style={{ color: "var(--gold-dark)" }}>
              Your Documents
            </p>
            <h1 className="text-3xl font-light shimmer">Translation History</h1>
            <div className="ornament-line mt-4" />
          </div>

          <div
            className="relative"
            style={{ background: "var(--dark-card)", border: "1px solid var(--dark-border)" }}
          >
            <div className="corner-ornament tl" />
            <div className="corner-ornament tr" />
            <div className="corner-ornament bl" />
            <div className="corner-ornament br" />

            <div className="p-8">
              {loading ? (
                <p className="text-center text-sm py-8" style={{ color: "var(--text-muted)" }}>
                  Loading...
                </p>
              ) : translations.length === 0 ? (
                <p className="text-center text-sm py-8" style={{ color: "var(--text-muted)" }}>
                  No translations yet
                </p>
              ) : (
                <div className="space-y-3">
                  {translations.map((t) => (
                    <div
                      key={t._id}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                      style={{ border: "1px solid var(--dark-border)", background: "#0d0d15" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center"
                          style={{ border: "1px solid var(--dark-border)" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-mono truncate" style={{ color: "var(--gold-light)" }}>
                            {t.fileName}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                            {formatDate(t.translatedAt)}
                          </p>
                        </div>
                      </div>

                      <a
                        href={`/api/download/${t.jobId}`}
                        download={downloadName(t.fileName)}
                        className="flex-shrink-0 text-xs tracking-widest uppercase px-4 py-2 transition-colors duration-200"
                        style={{ border: "1px solid var(--gold-dark)", color: "var(--gold-dark)", whiteSpace: "nowrap" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gold)"; e.currentTarget.style.borderColor = "var(--gold)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--gold-dark)"; e.currentTarget.style.borderColor = "var(--gold-dark)"; }}
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
