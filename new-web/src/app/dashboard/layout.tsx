import Link from "next/link";
import { type ReactNode } from "react";
import { LayoutDashboard, BarChart3, FileText } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Queue", icon: LayoutDashboard },
  { href: "/dashboard/eval", label: "Eval", icon: BarChart3 },
  { href: "/dashboard/audit", label: "Audit", icon: FileText },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: "var(--color-bg)" }}>
      {/* Sidebar */}
      <nav
        className="flex flex-col w-56 shrink-0"
        style={{ borderRight: "1px solid var(--color-border)", background: "var(--color-surface)" }}
        aria-label="Dashboard navigation"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--color-primary)" }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-white stroke-2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="font-bold" style={{ color: "var(--color-text)" }}>Recall</span>
          <span
            className="ml-auto text-[10px] font-medium rounded px-1.5 py-0.5"
            style={{ color: "var(--color-muted)", background: "var(--color-surface-2)" }}
          >
            MD
          </span>
        </div>

        {/* Nav links */}
        <div className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors group"
              style={{ color: "var(--color-muted)" }}
            >
              <Icon className="h-4 w-4 shrink-0 transition-colors" />
              {label}
            </Link>
          ))}
        </div>

        {/* Bottom: theme toggle + doctor badge */}
        <div className="px-4 py-3 space-y-3" style={{ borderTop: "1px solid var(--color-border)" }}>
          <ThemeToggle className="w-full justify-start gap-2 px-2" />
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "var(--color-routine-bg)" }}
            >
              <span className="text-xs font-bold" style={{ color: "var(--color-routine)" }}>DC</span>
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Dr. Chen</p>
              <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>Radiologist</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main id="main-content" className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
