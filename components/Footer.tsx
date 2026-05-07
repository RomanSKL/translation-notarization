export default function Footer() {
  return (
    <footer
      className="w-full px-8 py-6"
      style={{ borderTop: "1px solid var(--dark-border)" }}
    >
      <div className="max-w-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          © {new Date().getFullYear()} NotarizePro — All rights reserved
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://romanskl.github.io/translation-notarization/architecture.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs tracking-wider uppercase transition-colors duration-200"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            Architecture
          </a>
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--gold-dark)" }}
            />
            <p className="text-xs tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
              Certified Document Translation
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
