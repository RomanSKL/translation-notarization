"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";

const ACCEPTED = [".pdf", ".doc", ".docx"];
const ACCEPTED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export default function UploadZone({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [ripples, setRipples] = useState<number[]>([]);

  function validate(file: File): boolean {
    return ACCEPTED_MIME.includes(file.type) || ACCEPTED.some((ext) => file.name.endsWith(ext));
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && validate(file)) onFile(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file && validate(file)) onFile(file);
  }

  function handleClick() {
    if (disabled) return;
    const id = Date.now();
    setRipples((r) => [...r, id]);
    setTimeout(() => setRipples((r) => r.filter((x) => x !== id)), 1000);
    inputRef.current?.click();
  }

  const active = dragging && !disabled;

  return (
    <>
      <style>{`
        @keyframes ripple {
          0%   { transform: scale(0.4); opacity: 0.5; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        .upload-icon-wrap {
          animation: float 3s ease-in-out infinite;
        }
        .upload-icon-wrap:hover {
          animation: none;
        }
      `}</style>

      <div
        style={{
          padding: "52px 24px",
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          position: "relative",
        }}
        onClick={handleClick}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />

        {/* Ripple container */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: 28 }}>
          {/* Ripple circles */}
          {ripples.map((id) => (
            <div
              key={id}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "1px solid var(--gold)",
                animation: "ripple 1s ease-out forwards",
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Idle pulse rings */}
          {!active && (
            <>
              <div style={{
                position: "absolute", inset: -16, borderRadius: "50%",
                border: "1px solid var(--gold-dark)", opacity: 0.3,
                animation: "ripple 2.5s ease-out infinite",
                animationDelay: "0s", pointerEvents: "none",
              }} />
              <div style={{
                position: "absolute", inset: -16, borderRadius: "50%",
                border: "1px solid var(--gold-dark)", opacity: 0.2,
                animation: "ripple 2.5s ease-out infinite",
                animationDelay: "0.8s", pointerEvents: "none",
              }} />
            </>
          )}

          {/* Icon */}
          <div className="upload-icon-wrap">
            <svg
              width="72" height="72" viewBox="0 0 24 24" fill="none"
              stroke={active ? "var(--gold)" : "var(--gold-dark)"}
              strokeWidth="0.8"
              style={{ transition: "stroke 0.3s ease", display: "block" }}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 12 15 15" />
            </svg>
          </div>
        </div>

        <p
          className="text-sm mb-2"
          style={{ color: active ? "var(--gold-light)" : "#c8c8d8", transition: "color 0.3s ease" }}
        >
          {active ? "Release to upload" : "Drop your document here"}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          or click to browse files
        </p>
      </div>
    </>
  );
}
