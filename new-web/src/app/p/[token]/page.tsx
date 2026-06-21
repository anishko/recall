"use client";
import { use, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, Copy, MessageSquare, Share2, Check, Lock, Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { MOCK_PATIENT_VIEWS } from "@/lib/mockCases";
import type { Locale, PatientView } from "@/lib/types";
import { PatientHero } from "@/components/PatientHero";
import { FindingCard } from "@/components/FindingCard";
import { MeaningCard } from "@/components/MeaningCard";
import { NextStepsTimeline } from "@/components/NextStepsTimeline";
import { useTranslation } from "@/hooks/useTranslation";

function detectLocale(langParam: string | null, preferred: Locale): Locale {
  const valid: Locale[] = ["en", "ar-TN", "fr", "zh"];
  if (langParam && valid.includes(langParam as Locale)) return langParam as Locale;
  if (preferred && valid.includes(preferred)) return preferred;
  if (typeof navigator !== "undefined") {
    const nav = navigator.language;
    if (nav.startsWith("ar")) return "ar-TN";
    if (nav.startsWith("fr")) return "fr";
    if (nav.startsWith("zh")) return "zh";
  }
  return "en";
}

const URGENCY_BG: Record<string, string> = {
  URGENT:  "var(--color-urgent-bg)",
  SHORT:   "var(--color-short-bg)",
  ROUTINE: "var(--color-routine-bg)",
  NO_FU:   "var(--color-nofu-bg)",
};
const URGENCY_FG: Record<string, string> = {
  URGENT:  "var(--color-urgent)",
  SHORT:   "var(--color-short)",
  ROUTINE: "var(--color-routine)",
  NO_FU:   "var(--color-nofu)",
};
const URGENCY_MSG: Record<string, Record<Locale, string>> = {
  URGENT:  { en: "We need to see you soon", fr: "Nous devons vous voir bientôt", "ar-TN": "نحتاج رؤيتك قريباً", zh: "我们需要尽快见您" },
  SHORT:   { en: "Please schedule in 90 days", fr: "Veuillez prendre rendez-vous d'ici 90 jours", "ar-TN": "يرجى تحديد موعد خلال 90 يوم", zh: "请在90天内安排" },
  ROUTINE: { en: "Schedule at your convenience", fr: "Prenez rendez-vous quand vous le souhaitez", "ar-TN": "حدد موعداً عند راحتك", zh: "请在方便时安排" },
  NO_FU:   { en: "No follow-up needed", fr: "Aucun suivi nécessaire", "ar-TN": "لا حاجة لمتابعة", zh: "无需随访" },
};

export default function PatientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const view: PatientView | undefined = MOCK_PATIENT_VIEWS[token];

  const [locale, setLocale] = useState<Locale>(() =>
    detectLocale(searchParams.get("lang"), view?.preferredLanguage ?? "en")
  );
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation(locale);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("recall_locale", locale);
    document.documentElement.dir = locale === "ar-TN" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    return () => { document.documentElement.dir = "ltr"; };
  }, [locale]);

  if (!view) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
        <div className="text-center space-y-4 max-w-sm">
          <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "var(--color-surface-2)" }}>
            <Lock className="h-7 w-7" style={{ color: "var(--color-muted)" }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Link expired</h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--color-muted)" }}>{t("patient.link_expired")}</p>
        </div>
      </main>
    );
  }

  const exp = view.explanation[locale] ?? view.explanation["en"];
  const familyUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${token}/family` : `/p/${token}/family`;

  function handleCopyFamilyLink() {
    navigator.clipboard.writeText(familyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div dir={locale === "ar-TN" ? "rtl" : "ltr"} lang={locale} style={{ background: "var(--color-bg)", minHeight: "100dvh" }}>

      {/* ── Mobile sticky top bar ─────────────────────── */}
      <header
        className="sticky top-0 z-30 lg:hidden flex items-center justify-between px-4 py-3"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
      >
        <PatientHero name={view.patientFirstName} lang={locale} onLangChange={setLocale} compact className="flex-1" />
      </header>

      <main id="main-content" className="mx-auto max-w-5xl px-4 pt-5 pb-28 lg:py-10 lg:px-8">

        {/* Desktop-only hero */}
        <div className="hidden lg:block mb-8">
          <PatientHero name={view.patientFirstName} lang={locale} onLangChange={setLocale} subtitle={t("patient.hero_subtitle")} />
        </div>

        {/* Mobile greeting */}
        <div className="lg:hidden mb-5">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--color-text)" }}>
            {locale === "ar-TN" ? "مرحبا" : locale === "fr" ? "Bonjour" : locale === "zh" ? "你好" : "Hi"},{" "}
            {view.patientFirstName}
          </h1>
          <p className="mt-1 text-base leading-relaxed" style={{ color: "var(--color-muted)" }}>
            {t("patient.hero_subtitle")}
          </p>
        </div>

        {/* Urgency status banner — always visible, top of content */}
        {view.urgency !== "NO_FU" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-2xl p-4 flex items-center gap-4"
            style={{
              background: URGENCY_BG[view.urgency],
              border: `1px solid color-mix(in oklch, ${URGENCY_FG[view.urgency]} 25%, transparent)`,
            }}
          >
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 text-xl font-bold"
              style={{ background: `color-mix(in oklch, ${URGENCY_FG[view.urgency]} 15%, transparent)`, color: URGENCY_FG[view.urgency] }}
            >
              {view.urgency === "URGENT" ? "!" : view.urgency === "SHORT" ? "~" : "✓"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold leading-tight" style={{ color: URGENCY_FG[view.urgency] }}>
                {URGENCY_MSG[view.urgency]?.[locale] ?? URGENCY_MSG[view.urgency]?.["en"]}
              </p>
              <p className="text-sm mt-0.5" style={{ color: URGENCY_FG[view.urgency], opacity: 0.75 }}>
                {view.recommendedTimeframe} · {view.doctorName}
              </p>
            </div>
            <button
              onClick={() => router.push(`/p/${token}/scheduling`)}
              className="shrink-0 flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all"
              style={{ background: URGENCY_FG[view.urgency] }}
            >
              {t("patient.book_now")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {/* Two-column layout on desktop */}
        <div className="lg:grid lg:grid-cols-[2fr_3fr] lg:gap-8 space-y-4 lg:space-y-0">

          {/* Left: Scan image */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            <FindingCard
              finding={exp.findingSimple}
              sliceUrl={view.sliceUrl}
              highlight={view.highlight}
              doctorViewLabel={t("patient.show_doctor_view")}
              hideDoctorViewLabel={t("patient.hide_doctor_view")}
              heading={t("patient.what_we_found")}
            />
          </div>

          {/* Right: Info stack */}
          <div className="space-y-4">
            <MeaningCard
              tier={view.urgency}
              paragraph1={exp.paragraph1}
              paragraph2={exp.paragraph2}
              paragraph3={exp.paragraph3}
              heading={t("patient.what_this_means")}
            />

            <NextStepsTimeline
              steps={exp.steps}
              heading={t("patient.what_happens_next")}
              bookLabel={t("patient.book_now")}
              onBook={() => router.push(`/p/${token}/scheduling`)}
            />

            {/* Questions */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.32 }}
              className="card-surface p-6 space-y-5"
              aria-labelledby="questions-heading"
            >
              <h2 id="questions-heading" className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                {t("patient.questions")}
              </h2>

              <div className="space-y-2">
                <a
                  href="tel:5557322255"
                  className="flex items-center gap-4 rounded-xl px-4 py-3.5 text-base font-medium transition-colors"
                  style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-2)", color: "var(--color-text)" }}
                >
                  <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--color-routine-bg)" }}>
                    <Phone className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
                  </div>
                  {t("patient.call_us")}
                  <ChevronRight className="h-4 w-4 ml-auto" style={{ color: "var(--color-muted-2)" }} />
                </a>
                <a
                  href="mailto:nurse@recall.com"
                  className="flex items-center gap-4 rounded-xl px-4 py-3.5 text-base font-medium transition-colors"
                  style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-2)", color: "var(--color-text)" }}
                >
                  <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--color-routine-bg)" }}>
                    <Mail className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
                  </div>
                  {t("patient.email_nurse")}
                  <ChevronRight className="h-4 w-4 ml-auto" style={{ color: "var(--color-muted-2)" }} />
                </a>
              </div>

              {/* Family sharing */}
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1.25rem" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Share2 className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    {t("patient.share_family")}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleCopyFamilyLink}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors"
                    style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-2)", color: "var(--color-text)" }}
                  >
                    {copied ? (
                      <><Check className="h-4 w-4" style={{ color: "var(--color-success)" }} /><span style={{ color: "var(--color-success)" }}>Copied!</span></>
                    ) : (
                      <><Copy className="h-4 w-4" />{t("patient.copy_family_link")}</>
                    )}
                  </button>
                  <Link
                    href={`/p/${token}/send-to-family`}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-white transition-colors"
                    style={{ background: "var(--color-primary)" }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    {t("patient.text_to_someone")}
                  </Link>
                </div>
              </div>
            </motion.section>

            <footer className="text-center space-y-1.5 pb-4">
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted-2)" }}>{t("patient.disclaimer")}</p>
              <p className="text-xs" style={{ color: "var(--color-muted-2)" }}>{t("patient.powered_by")}</p>
            </footer>
          </div>
        </div>
      </main>

      {/* Mobile sticky bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 lg:hidden px-4 py-3 z-20"
        style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}
      >
        <button
          onClick={() => router.push(`/p/${token}/scheduling`)}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-base font-bold text-white transition-colors"
          style={{ background: "var(--color-primary)" }}
        >
          <Calendar className="h-5 w-5" />
          {t("patient.book_now")} →
        </button>
      </div>
    </div>
  );
}
