"use client";
import { useMemo } from "react";
import type { Locale } from "@/lib/types";
import en from "@/i18n/en.json";
import zh from "@/i18n/zh.json";
import arTN from "@/i18n/ar-TN.json";
import fr from "@/i18n/fr.json";

const translations: Record<string, Record<string, unknown>> = {
  en,
  "ar-TN": arTN,
  fr,
  zh,
};

function getNestedValue(obj: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : key;
}

export function useTranslation(locale: Locale) {
  return useMemo(() => {
    const msgs = translations[locale] ?? translations["en"];
    const fallback = translations["en"];

    const t = (key: string): string => {
      const val = getNestedValue(msgs as Record<string, unknown>, key);
      if (val === key) {
        return getNestedValue(fallback as Record<string, unknown>, key);
      }
      return val;
    };

    return { t };
  }, [locale]);
}
