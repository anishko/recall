import Link from "next/link";
import { type ReactNode } from "react";
import { LayoutDashboard, BarChart3, FileText, Upload } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Queue", icon: LayoutDashboard },
  { href: "/dashboard/eval", label: "Eval", icon: BarChart3 },
  { href: "/dashboard/audit", label: "Audit", icon: FileText },
  { href: "/upload", label: "Upload report", icon: Upload },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <nav
        className="flex flex-col w-56 shrink-0"
        style={{
          borderRight: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
        aria-label="Dashboard navigation"
      >
        <div
          className="px-5 py-5"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <Logo href="/dashboard" />
          <p
            className="mt-2 text-[10px] uppercase tracking-widest"
            style={{ color: "var(--color-muted-2)" }}
          >
            Physician workspace
          </p>
        </div>

        <div className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-surface-2)]"
              style={{ color: "var(--color-muted)" }}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-70" strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </div>

        <div
          className="px-4 py-4 space-y-3"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <ThemeToggle className="w-full justify-start gap-2 px-2 rounded-lg" />
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-medium"
              style={{
                background: "var(--color-surface-2)",
                color: "var(--color-primary)",
                border: "1px solid var(--color-border)",
              }}
            >
              DC
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
                Dr. Chen
              </p>
              <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                Radiologist
              </p>
            </div>
          </div>
        </div>
      </nav>

      <main id="main-content" className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
