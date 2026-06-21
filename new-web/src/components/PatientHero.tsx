"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/types";
import { LangSwitcher } from "./LangSwitcher";
import { ThemeToggle } from "./ThemeToggle";

interface PatientHeroProps {
  name: string;
  lang: Locale;
  onLangChange: (l: Locale) => void;
  subtitle?: string;
  /** compact = mobile sticky bar mode — just logo + controls, no greeting */
  compact?: boolean;
  className?: string;
}

const GREETINGS: Record<Locale, string> = {
  en: "Hi",
  "ar-TN": "مرحبا",
  fr: "Bonjour",
  zh: "你好",
};

export function PatientHero({ name, lang, onLangChange, subtitle, compact = false, className }: PatientHeroProps) {
  const Logo = () => (
    <div className="flex items-center gap-2 shrink-0">
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
  );

  if (compact) {
    return (
      <div className={cn("flex items-center justify-between w-full gap-3", className)}>
        <Logo />
        <div className="flex items-center gap-2">
          <LangSwitcher value={lang} onChange={onLangChange} />
          <ThemeToggle />
        </div>
      </div>
    );
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn("space-y-4", className)}
    >
      {/* Top bar: logo + lang + theme */}
      <div className="flex items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-2">
          <LangSwitcher value={lang} onChange={onLangChange} />
          <ThemeToggle />
        </div>
      </div>

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--color-text)" }}>
          {GREETINGS[lang]} {name}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm leading-relaxed max-w-md" style={{ color: "var(--color-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
    </motion.header>
  );
}
