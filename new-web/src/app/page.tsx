"use client";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

/* ── Animated CT-scan ring background ────────────────────────
   Concentric circles + radial grid lines imitating axial CT slices.
   Pure SVG + CSS — no external deps.                              */
function CTBackground() {
  const rings = [280, 220, 165, 118, 78, 46, 22];
  const spokes = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      <svg
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        width="640"
        height="640"
        viewBox="-320 -320 640 640"
        fill="none"
      >
        {/* Spoke lines */}
        {spokes.map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={angle}
              x1="0"
              y1="0"
              x2={Math.cos(rad) * 300}
              y2={Math.sin(rad) * 300}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-[var(--color-primary)]"
              opacity="0.08"
            />
          );
        })}

        {/* Rings */}
        {rings.map((r, i) => (
          <circle
            key={r}
            cx="0"
            cy="0"
            r={r}
            stroke="currentColor"
            className="text-[var(--color-primary)]"
            strokeWidth={i === 0 ? "0.5" : "1"}
            opacity={i === 0 ? 0.06 : 0.10 - i * 0.01}
            style={{
              animation: `ct-pulse ${3 + i * 0.6}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}

        {/* Crosshairs */}
        <line x1="-300" y1="0" x2="300" y2="0" stroke="currentColor" className="text-[var(--color-primary)]" strokeWidth="0.5" opacity="0.07" />
        <line x1="0" y1="-300" x2="0" y2="300" stroke="currentColor" className="text-[var(--color-primary)]" strokeWidth="0.5" opacity="0.07" />

        {/* Center dot */}
        <circle cx="0" cy="0" r="3" fill="currentColor" className="text-[var(--color-primary)]" opacity="0.2" />

        {/* Annotation tick marks */}
        {rings.slice(1, -1).map((r) => (
          <g key={`tick-${r}`} opacity="0.12">
            <line x1={r} y1="-4" x2={r} y2="4" stroke="currentColor" className="text-[var(--color-primary)]" strokeWidth="0.8" />
            <line x1={-r} y1="-4" x2={-r} y2="4" stroke="currentColor" className="text-[var(--color-primary)]" strokeWidth="0.8" />
            <line x1="-4" y1={r} x2="4" y2={r} stroke="currentColor" className="text-[var(--color-primary)]" strokeWidth="0.8" />
            <line x1="-4" y1={-r} x2="4" y2={-r} stroke="currentColor" className="text-[var(--color-primary)]" strokeWidth="0.8" />
          </g>
        ))}
      </svg>

      {/* Radial gradient fade */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 40%, var(--color-bg) 80%)",
        }}
      />

      <style>{`
        @keyframes ct-pulse {
          from { opacity: var(--from-op, 0.08); }
          to   { opacity: var(--to-op,   0.04); }
        }
      `}</style>
    </div>
  );
}

export default function HomePage() {
  return (
    <main
      id="main-content"
      className="relative min-h-dvh flex flex-col overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      <CTBackground />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--color-primary)" }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-white stroke-2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Recall</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-lg space-y-6">

          {/* Badge */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: "var(--color-routine-bg)",
              color: "var(--color-routine)",
              border: "1px solid color-mix(in oklch, var(--color-routine) 25%, transparent)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-routine)" }} />
            Cal Hacks 2026 · Ddoski&rsquo;s Lab Grand Prize
          </div>

          {/* Wordmark */}
          <div className="space-y-3">
            <h1
              className="text-6xl sm:text-7xl font-extrabold tracking-tight leading-none"
              style={{ color: "var(--color-text)" }}
            >
              Recall
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed" style={{ color: "var(--color-muted)" }}>
              Radiology follow-up,{" "}
              <span style={{ color: "var(--color-text)", fontWeight: 600 }}>actually delivered.</span>
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "AI-assisted triage",
              "Plain-language explanations",
              "Multilingual",
              "Live call transcripts",
            ].map((f) => (
              <span
                key={f}
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  background: "var(--color-surface-2)",
                  color: "var(--color-muted)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {f}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "var(--color-primary)", boxShadow: "0 4px 16px color-mix(in oklch, var(--color-primary) 40%, transparent)" }}
            >
              Physician dashboard →
            </Link>
            <Link
              href="/p/tok_sarah_abc123"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:opacity-90"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
            >
              Patient portal →
            </Link>
          </div>

          {/* Demo links */}
          <div className="flex flex-wrap justify-center gap-3 text-xs pt-1" style={{ color: "var(--color-muted-2)" }}>
            <Link href="/p/tok_grandma_chen_xyz789?lang=zh" className="hover:underline transition-colors" style={{ color: "var(--color-muted)" }}>
              Grandma Chen (中文)
            </Link>
            <span aria-hidden>·</span>
            <Link href="/p/tok_alex_ar789?lang=ar-TN" className="hover:underline transition-colors" style={{ color: "var(--color-muted)" }}>
              Alex (عربي تونسي)
            </Link>
            <span aria-hidden>·</span>
            <Link href="/p/tok_sarah_abc123/family" className="hover:underline transition-colors" style={{ color: "var(--color-muted)" }}>
              Family view
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <footer
        className="relative z-10 px-6 py-4 flex items-center justify-between text-xs"
        style={{ color: "var(--color-muted-2)", borderTop: "1px solid var(--color-border)" }}
      >
        <span>Recall · Cal Hacks 2026</span>
        <span>Source: Radiopaedia T2A Lung Cancer</span>
      </footer>
    </main>
  );
}
