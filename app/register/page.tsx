"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--dark)" }}>
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 text-sm outline-none transition-all"
                style={{ background: "#0d0d15", border: "1px solid var(--dark-border)", color: "#e8e8f0" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--gold-dark)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--dark-border)")}
              />
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
  );
}
