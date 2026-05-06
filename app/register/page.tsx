"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registration failed");
    } else {
      router.push("/login");
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--dark)" }}>
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.4em] uppercase mb-3" style={{ color: "var(--gold-dark)" }}>
            NotarizePro
          </p>
          <h1 className="text-3xl font-light shimmer">Create Account</h1>
          <div className="ornament-line mt-4">
            <span className="text-xs tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
              Join NotarizePro
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="relative p-8" style={{ background: "var(--dark-card)", border: "1px solid var(--dark-border)" }}>
          <div className="corner-ornament tl" />
          <div className="corner-ornament tr" />
          <div className="corner-ornament bl" />
          <div className="corner-ornament br" />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "var(--text-muted)" }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 text-sm outline-none transition-all"
                style={{ background: "#0d0d15", border: "1px solid var(--dark-border)", color: "#e8e8f0" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--gold-dark)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--dark-border)")}
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "var(--text-muted)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 text-sm outline-none transition-all"
                style={{ background: "#0d0d15", border: "1px solid var(--dark-border)", color: "#e8e8f0" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--gold-dark)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--dark-border)")}
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "var(--text-muted)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 text-sm outline-none transition-all pr-11"
                  style={{ background: "#0d0d15", border: "1px solid var(--dark-border)", color: "#e8e8f0" }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--gold-dark)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--dark-border)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-center" style={{ color: "#c04040" }}>{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              <span>{loading ? "Creating account..." : "Create Account"}</span>
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--gold-dark)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gold-dark)")}
          >
            Sign in
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
