"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/types";
import { LangSwitcher } from "./LangSwitcher";
import { Logo } from "./Logo";

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

export function PatientHero({
  name,
  lang,
  onLangChange,
  subtitle,
  compact = false,
  className,
}: PatientHeroProps) {
  if (compact) {
    return (
      <div className={cn("flex items-center justify-between w-full gap-3", className)}>
        <Logo size="default" />
        <LangSwitcher value={lang} onChange={onLangChange} />
      </div>
    );
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn("space-y-5", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <Logo size="header" />
        <LangSwitcher value={lang} onChange={onLangChange} />
      </div>

      <div className="space-y-3">
        <h1
          className="font-display text-4xl sm:text-5xl leading-[1.08] text-balance"
          style={{ color: "var(--color-text)" }}
        >
          {GREETINGS[lang]} {name}.
        </h1>
        {subtitle && (
          <p
            className="font-sans text-base sm:text-lg leading-relaxed max-w-xl"
            style={{ color: "var(--color-muted-2)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </motion.header>
  );
}
