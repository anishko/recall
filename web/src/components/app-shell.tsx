import Link from "next/link";
import { Activity } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-col">
      {/* Ambient backdrop: a soft clinical glow, subtle in light, richer in dark. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_50%_-10%,var(--color-primary)/8%,transparent)] opacity-60 dark:opacity-100"
      />
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
        <div className="mx-auto flex h-15 max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20 ring-inset transition-transform group-hover:scale-105">
              <Activity className="h-4.5 w-4.5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-heading text-[15px] font-semibold tracking-tight">
                RadRelay
              </span>
              <span className="hidden text-[11px] text-muted-foreground sm:block">
                Radiology follow-up, closed.
              </span>
            </span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            <Link
              href="/"
              className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cases
            </Link>
            <Link
              href="/upload"
              className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Upload
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="hidden rounded-full border bg-card px-2.5 py-1 font-medium text-muted-foreground sm:inline">
              Demo data
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
            <ThemeToggle />
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
