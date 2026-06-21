import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/types";

const FLAGS: Record<Locale, { emoji: string; label: string }> = {
  en: { emoji: "🇺🇸", label: "English" },
  "ar-TN": { emoji: "🇹🇳", label: "Tunisian Arabic" },
  fr: { emoji: "🇫🇷", label: "French" },
  zh: { emoji: "🇨🇳", label: "Chinese" },
};

interface LanguageFlagProps {
  lang: Locale;
  className?: string;
  showLabel?: boolean;
}

export function LanguageFlag({ lang, className, showLabel = false }: LanguageFlagProps) {
  const { emoji, label } = FLAGS[lang] ?? FLAGS["en"];
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      title={label}
      aria-label={label}
    >
      <span className="text-base leading-none" aria-hidden="true">{emoji}</span>
      {showLabel && <span className="text-xs text-[oklch(0.5_0.02_250)]">{label}</span>}
    </span>
  );
}
