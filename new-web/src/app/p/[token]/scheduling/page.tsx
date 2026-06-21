"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MOCK_PATIENT_VIEWS, generateSlots } from "@/lib/mockCases";
import type { Locale } from "@/lib/types";
import { SchedulingGrid } from "@/components/SchedulingGrid";
import { LangSwitcher } from "@/components/LangSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTranslation } from "@/hooks/useTranslation";

export default function SchedulingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const view = MOCK_PATIENT_VIEWS[token];

  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("recall_locale") as Locale) ?? view?.preferredLanguage ?? "en";
    }
    return view?.preferredLanguage ?? "en";
  });
  const { t } = useTranslation(locale);

  useEffect(() => {
    document.documentElement.dir = locale === "ar-TN" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    return () => { document.documentElement.dir = "ltr"; };
  }, [locale]);

  const daysAhead = view?.urgency === "URGENT" ? 14 : 90;
  const slots = generateSlots(daysAhead);

  if (!view) {
    return (
      <main
        className="min-h-dvh flex items-center justify-center"
        style={{ background: "var(--color-bg)" }}
      >
        <p style={{ color: "var(--color-muted)" }}>{t("patient.link_expired")}</p>
      </main>
    );
  }

  return (
    <div
      dir={locale === "ar-TN" ? "rtl" : "ltr"}
      lang={locale}
      style={{ background: "var(--color-bg)", minHeight: "100dvh" }}
    >
      {/* Sticky header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <button
          onClick={() => router.push(`/p/${token}`)}
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: "var(--color-muted)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <LangSwitcher value={locale} onChange={setLocale} />
          <ThemeToggle />
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-xl px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            {t("scheduling.title")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            {view.patientFirstName} · {view.recommendedTimeframe}
          </p>
        </div>

        <div className="card-surface p-5 sm:p-6">
          <SchedulingGrid
            slots={slots}
            onPick={(slot) => {
              fetch(`/api/patient/${token}/schedule`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(slot),
              });
            }}
            confirmLabel={t("scheduling.confirm")}
            noSlotsLabel={t("scheduling.no_slots")}
          />
        </div>

        <footer className="text-center pb-8">
          <p className="text-xs" style={{ color: "var(--color-muted-2)" }}>{t("patient.disclaimer")}</p>
        </footer>
      </main>
    </div>
  );
}
