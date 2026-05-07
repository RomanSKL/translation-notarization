"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className="w-full px-8 py-5" style={{ borderBottom: "1px solid var(--dark-border)" }}>
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="var(--gold-dark)" strokeWidth="1" />
            <circle cx="12" cy="12" r="6" stroke="var(--gold-dark)" strokeWidth="0.5" />
            <path d="M12 3 L13.5 8 L18.5 8 L14.5 11 L16 16 L12 13 L8 16 L9.5 11 L5.5 8 L10.5 8 Z"
              fill="none" stroke="var(--gold)" strokeWidth="0.5" />
          </svg>
          <span className="text-xs tracking-[0.3em] uppercase" style={{ color: "var(--gold-dark)" }}>
            NotarizePro
          </span>
          <span
            className="text-xs tracking-widest uppercase px-2 py-0.5"
            style={{
              border: "1px solid #c04040",
              color: "#c04040",
              fontSize: "9px",
              letterSpacing: "0.15em",
            }}
          >
            DEMO
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          {session ? (
            <>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {session.user?.name}
              </span>
              <Link
                href="/history"
                className="text-xs tracking-widest uppercase transition-colors duration-200"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                History
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-xs tracking-widest uppercase transition-colors duration-200"
                style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs tracking-widest uppercase px-4 py-2 transition-colors duration-200"
                style={{
                  border: pathname === "/login" ? "1px solid var(--gold)" : "1px solid transparent",
                  color: pathname === "/login" ? "var(--gold)" : "var(--text-muted)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gold)"; e.currentTarget.style.borderColor = "var(--gold)"; }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = pathname === "/login" ? "var(--gold)" : "var(--text-muted)";
                  e.currentTarget.style.borderColor = pathname === "/login" ? "var(--gold)" : "transparent";
                }}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-xs tracking-widest uppercase px-4 py-2 transition-colors duration-200"
                style={{
                  border: pathname === "/register" ? "1px solid var(--gold)" : "1px solid transparent",
                  color: pathname === "/register" ? "var(--gold)" : "var(--text-muted)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gold)"; e.currentTarget.style.borderColor = "var(--gold)"; }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = pathname === "/register" ? "var(--gold)" : "var(--text-muted)";
                  e.currentTarget.style.borderColor = pathname === "/register" ? "var(--gold)" : "transparent";
                }}
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
