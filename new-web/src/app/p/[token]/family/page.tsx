"use client";
import { use, useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Locale, PatientView } from "@/lib/types";
import { FamilyViewBanner } from "@/components/FamilyViewBanner";
import { MeaningCard } from "@/components/MeaningCard";
import { LangSwitcher } from "@/components/LangSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { useTranslation } from "@/hooks/useTranslation";

export default function FamilyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [view, setView] = useState<PatientView | null>(null);
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("recall_locale") as Locale) ?? "en";
    }
    return "en";
  });
  const { t } = useTranslation(locale);

  useEffect(() => {
    fetch(`/api/patient/${encodeURIComponent(token)}?view=family`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PatientView | null) => {
        if (!data) return;
        setView(data);
        const stored =
          typeof window !== "undefined"
            ? (localStorage.getItem("recall_locale") as Locale | null)
            : null;
        setLocale(stored ?? data.preferredLanguage ?? "en");
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    document.documentElement.dir = locale === "ar-TN" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    return () => { document.documentElement.dir = "ltr"; };
  }, [locale]);

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

  const exp = view.explanation[locale] ?? view.explanation["en"];

  return (
    <div
      dir={locale === "ar-TN" ? "rtl" : "ltr"}
      lang={locale}
      style={{ background: "var(--color-bg)", minHeight: "100dvh" }}
    >
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--color-primary)" }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-none stroke-white stroke-2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
            Recall
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LangSwitcher value={locale} onChange={setLocale} />
          <ThemeToggle />
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto max-w-xl px-4 py-6 space-y-4 pb-10"
      >
        <FamilyViewBanner
          patientFirstName={view.patientFirstName}
          bookingLink={`/p/${token}/scheduling`}
          viewingAsLabel={t("patient.viewing_as_family")}
          theyCanBookLabel={t("patient.they_can_book")}
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="card-surface p-6 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                {view.patientFirstName} · {view.patientAgeRange}
              </p>
              <h1
                className="text-lg font-bold mt-0.5"
                style={{ color: "var(--color-text)" }}
              >
                {exp.findingSimple}
              </h1>
            </div>
            <UrgencyBadge tier={view.urgency} size="md" />
          </div>

          <div style={{ height: "1px", background: "var(--color-border)" }} />

          <div className="space-y-2">
            {[exp.paragraph1, exp.paragraph2, exp.paragraph3].map((p, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-text)", opacity: 0.8 }}
              >
                {p}
              </p>
            ))}
          </div>

          <div
            className="rounded-xl p-3"
            style={{
              background: "var(--color-routine-bg)",
              border:
                "1px solid color-mix(in oklch, var(--color-primary) 20%, transparent)",
            }}
          >
            <p
              className="text-xs font-semibold mb-0.5"
              style={{ color: "var(--color-primary)" }}
            >
              Next step
            </p>
            <p className="text-sm" style={{ color: "var(--color-text)" }}>
              {view.recommendedTimeframe} · {view.doctorName}
            </p>
          </div>
        </motion.div>

        <MeaningCard
          tier={view.urgency}
          paragraph1={exp.paragraph1}
          paragraph2={exp.paragraph2}
          paragraph3={exp.paragraph3}
          heading={t("patient.what_this_means")}
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.12 }}
        >
          <a
            href={`/p/${token}/scheduling`}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-colors"
            style={{ background: "var(--color-primary)" }}
          >
            {t("patient.help_them_book")} →
          </a>
        </motion.div>

        <footer className="text-center pb-4">
          <p className="text-xs" style={{ color: "var(--color-muted-2)" }}>
            {t("patient.disclaimer")}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-muted-2)" }}>
            {t("patient.powered_by")}
          </p>
        </footer>
      </main>
    </div>
  );
}
