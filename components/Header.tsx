export default function Header() {
  return (
    <header
      className="w-full px-8 py-5"
      style={{ borderBottom: "1px solid var(--dark-border)" }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Seal icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="var(--gold-dark)" strokeWidth="1" />
            <circle cx="12" cy="12" r="6" stroke="var(--gold-dark)" strokeWidth="0.5" />
            <path
              d="M12 3 L13.5 8 L18.5 8 L14.5 11 L16 16 L12 13 L8 16 L9.5 11 L5.5 8 L10.5 8 Z"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="0.5"
            />
          </svg>
          <span className="text-xs tracking-[0.3em] uppercase" style={{ color: "var(--gold-dark)" }}>
            NotarizePro
          </span>
        </div>

        <nav className="flex items-center gap-6">
          {["Services", "About", "Contact"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-xs tracking-widest uppercase transition-colors duration-200"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              {item}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
