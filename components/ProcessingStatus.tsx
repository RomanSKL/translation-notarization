"use client";

import { useEffect, useState } from "react";
import { Stage } from "@/app/page";

const STEPS = [
  { id: "translating", label: "Translating document", sub: "English → Spanish" },
];

export default function ProcessingStatus({
  stage,
  fileName,
}: {
  stage: Stage;
  fileName: string;
}) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const t = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(t);
  }, []);

  const currentIdx = stage === "translating" ? 0 : 1;

  return (
    <div className="text-center">
      <p className="text-xs tracking-[0.3em] uppercase mb-8" style={{ color: "var(--text-muted)" }}>
        Processing
      </p>

      {/* Animated seal */}
      <div className="flex justify-center mb-10">
        <div className="relative">
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            fill="none"
            style={{ animation: "spin 8s linear infinite" }}
          >
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <circle cx="36" cy="36" r="32" stroke="var(--gold-dark)" strokeWidth="0.5" strokeDasharray="4 4" />
          </svg>
          <div
            className="absolute inset-0 flex items-center justify-center"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="mb-8 space-y-4">
        {STEPS.map((step, i) => {
          const isDone = i < currentIdx;
          const isActive = i === currentIdx;

          return (
            <div key={step.id} className="flex items-center gap-4">
              <div
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center"
                style={{
                  border: `1px solid ${isDone ? "var(--gold)" : isActive ? "var(--gold-dark)" : "var(--dark-border)"}`,
                }}
              >
                {isDone ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isActive ? (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: "var(--gold)",
                      animation: "pulse 1s ease-in-out infinite",
                    }}
                  />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--dark-border)" }} />
                )}
              </div>
              <div className="text-left flex-1">
                <p
                  className="text-xs tracking-wider"
                  style={{ color: isDone || isActive ? "var(--gold-light)" : "var(--text-muted)" }}
                >
                  {step.label}
                  {isActive && <span style={{ color: "var(--gold-dark)" }}>{dots}</span>}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{step.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div
        className="h-px w-full overflow-hidden"
        style={{ background: "var(--dark-border)" }}
      >
        <div
          className="progress-bar h-full transition-all duration-700"
          style={{ width: stage === "translating" ? "50%" : "90%" }}
        />
      </div>

      <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
        {fileName}
      </p>
    </div>
  );
}
