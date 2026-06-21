"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme } = useTheme();

  // Decide the target from the live DOM class (set by next-themes before paint),
  // so there's no need for a mounted flag or hydration guard.
  const toggle = () => {
    const dark = document.documentElement.classList.contains("dark");
    setTheme(dark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={toggle}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      {/* Moon in light mode, Sun in dark mode — toggled purely via CSS. */}
      <Moon className="h-4 w-4 dark:hidden" />
      <Sun className="hidden h-4 w-4 dark:block" />
    </button>
  );
}
