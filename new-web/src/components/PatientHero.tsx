"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/types";
import { Logo } from "./Logo";
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
  if (compact) {
    return (
      <div className={cn("flex items-center justify-between w-full gap-3", className)}>
        <Logo className="text-sm" />
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
        <Logo className="text-sm" />
        <div className="flex items-center gap-2">
          <LangSwitcher value={lang} onChange={onLangChange} />
          <ThemeToggle />
        </div>
      </div>

      {/* Greeting */}
      <div>
        <h1 className="font-display text-3xl leading-tight" style={{ color: "var(--color-text)" }}>
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
