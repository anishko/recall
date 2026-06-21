"use client";
import { use, useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Locale, PatientView } from "@/lib/types";
import { SendToFamilyForm } from "@/components/SendToFamilyForm";
import { LangSwitcher } from "@/components/LangSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTranslation } from "@/hooks/useTranslation";

export default function SendToFamilyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [view, setView] = useState<PatientView | null>(null);
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("recall_locale") as Locale) ?? "en";
    }
    return "en";
  });
  const { t } = useTranslation(locale);

  useEffect(() => {
    fetch(`/api/patient/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PatientView | null) => { if (data) setView(data); })
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

      <main id="main-content" className="mx-auto max-w-xl px-4 py-6 space-y-5">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--color-text)" }}
          >
            {t("sendToFamily.title")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            They&rsquo;ll receive a read-only family summary link.
          </p>
        </div>

        <div className="card-surface p-5 sm:p-6">
          <SendToFamilyForm
            token={token}
            labels={{
              title: t("sendToFamily.title"),
              phonePlaceholder: t("sendToFamily.phone_placeholder"),
              phoneLabel: t("sendToFamily.phone_label"),
              nameLabel: t("sendToFamily.name_label"),
              namePlaceholder: t("sendToFamily.name_placeholder"),
              languageLabel: t("sendToFamily.language_label"),
              consent: t("sendToFamily.consent"),
              send: t("sendToFamily.send"),
              sent: t("sendToFamily.sent"),
              sentSuffix: t("sendToFamily.sent_suffix"),
              rateLimit: t("sendToFamily.rate_limit"),
              mockedNote: t("sendToFamily.mocked_note"),
            }}
          />
        </div>

        <footer className="text-center pb-8">
          <p className="text-xs" style={{ color: "var(--color-muted-2)" }}>
            {t("patient.disclaimer")}
          </p>
        </footer>
      </main>
    </div>
  );
}
