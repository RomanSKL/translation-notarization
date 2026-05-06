"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
      router.refresh();
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
          <h1 className="text-3xl font-light shimmer">Sign In</h1>
          <div className="ornament-line mt-4">
            <span className="text-xs tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
              Sign in to your account
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
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: "#0d0d15",
                  border: "1px solid var(--dark-border)",
                  color: "#e8e8f0",
                }}
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
                  className="w-full px-4 py-3 text-sm outline-none transition-all pr-11"
                  style={{
                    background: "#0d0d15",
                    border: "1px solid var(--dark-border)",
                    color: "#e8e8f0",
                  }}
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
              <span>{loading ? "Signing in..." : "Sign In"}</span>
            </button>

            <div className="flex items-center gap-3 mt-5">
              <div className="flex-1 h-px" style={{ background: "var(--dark-border)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "var(--dark-border)" }} />
            </div>

            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full mt-4 flex items-center justify-center gap-3 px-4 py-3 text-xs tracking-widest uppercase transition-colors duration-200"
              style={{ border: "1px solid var(--dark-border)", color: "var(--text-muted)", background: "none", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold-dark)"; e.currentTarget.style.color = "var(--gold-dark)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--dark-border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "var(--gold-dark)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gold-dark)")}
          >
            Create one
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
