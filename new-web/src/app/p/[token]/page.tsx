"use client";
import { use, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  Copy,
  MessageSquare,
  Share2,
  Check,
  Lock,
  Calendar,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import type { Locale, PatientView } from "@/lib/types";
import { PatientHero } from "@/components/PatientHero";
import { FindingCard } from "@/components/FindingCard";
import { MeaningCard } from "@/components/MeaningCard";
import { NextStepsTimeline } from "@/components/NextStepsTimeline";
import { useTranslation } from "@/hooks/useTranslation";
import { Logo } from "@/components/Logo";
import { LangSwitcher } from "@/components/LangSwitcher";

function detectLocale(
  langParam: string | null,
  preferred: Locale,
): Locale {
  const valid: Locale[] = ["en", "ar-TN", "fr", "zh"];
  if (langParam && valid.includes(langParam as Locale))
    return langParam as Locale;
  if (preferred && valid.includes(preferred)) return preferred;
  if (typeof navigator !== "undefined") {
    const nav = navigator.language;
    if (nav.startsWith("ar")) return "ar-TN";
    if (nav.startsWith("fr")) return "fr";
    if (nav.startsWith("zh")) return "zh";
  }
  return "en";
}

const URGENCY_FG: Record<string, string> = {
  URGENT: "var(--color-urgent)",
  SHORT: "var(--color-short)",
  ROUTINE: "var(--color-routine)",
  NO_FU: "var(--color-nofu)",
};
const URGENCY_MSG: Record<string, Record<Locale, string>> = {
  URGENT: {
    en: "We need to see you soon",
    fr: "Nous devons vous voir bientôt",
    "ar-TN": "نحتاج رؤيتك قريباً",
    zh: "我们需要尽快见您",
  },
  SHORT: {
    en: "Please schedule in 90 days",
    fr: "Veuillez prendre rendez-vous d'ici 90 jours",
    "ar-TN": "يرجى تحديد موعد خلال 90 يوم",
    zh: "请在90天内安排",
  },
  ROUTINE: {
    en: "Schedule at your convenience",
    fr: "Prenez rendez-vous quand vous le souhaitez",
    "ar-TN": "حدد موعداً عند راحتك",
    zh: "请在方便时安排",
  },
  NO_FU: {
    en: "No follow-up needed",
    fr: "Aucun suivi nécessaire",
    "ar-TN": "لا حاجة لمتابعة",
    zh: "无需随访",
  },
};

export default function PatientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [view, setView] = useState<PatientView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [locale, setLocale] = useState<Locale>("en");
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation(locale);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("recall_theme", "dark");
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/patient/${encodeURIComponent(token)}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.ok ? r.json() : null;
      })
      .then((data: PatientView | null) => {
        if (!data) { setLoading(false); return; }
        setView(data);
        const langParam = searchParams.get("lang");
        const resolved = detectLocale(langParam, data.preferredLanguage);
        setLocale(resolved);
        if (typeof window !== "undefined") {
          localStorage.setItem("recall_locale", resolved);
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, [token, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.dir = locale === "ar-TN" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    return () => { document.documentElement.dir = "ltr"; };
  }, [locale]);

  function handleLangChange(l: Locale) {
    setLocale(l);
    if (typeof window !== "undefined") localStorage.setItem("recall_locale", l);
  }

  if (loading) {
    return (
      <main className="landing-page min-h-dvh flex items-center justify-center bg-black">
        <div
          className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--color-primary)" }}
        />
      </main>
    );
  }

  if (notFound || !view) {
    return (
      <main className="landing-page min-h-dvh flex items-center justify-center px-6 bg-black">
        <div className="text-center space-y-4 max-w-sm">
          <div className="mx-auto h-16 w-16 rounded-full landing-panel flex items-center justify-center">
            <Lock className="h-7 w-7" style={{ color: "var(--color-muted)" }} />
          </div>
          <h1 className="font-display text-3xl" style={{ color: "var(--color-text)" }}>
            Link expired
          </h1>
          <p className="font-sans text-base leading-relaxed" style={{ color: "var(--color-muted)" }}>
            {t("patient.link_expired")}
          </p>
        </div>
      </main>
    );
  }

  const exp = view.explanation[locale] ?? view.explanation["en"];
  const scanSlices = view.slices?.length ? view.slices : [view.sliceUrl];
  const familyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${token}/family`
      : `/p/${token}/family`;

  function handleCopyFamilyLink() {
    navigator.clipboard.writeText(familyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const urgencyColor = URGENCY_FG[view.urgency];

  return (
    <div
      dir={locale === "ar-TN" ? "rtl" : "ltr"}
      lang={locale}
      className="landing-page min-h-dvh bg-black"
    >
      {/* Mobile sticky header */}
      <header className="sticky top-0 z-30 lg:hidden glass-header px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Logo size="default" />
          <LangSwitcher value={locale} onChange={handleLangChange} />
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-5 pb-28 lg:py-10">
        {/* Desktop hero */}
        <div className="hidden lg:block mb-8">
          <PatientHero
            name={view.patientFirstName}
            lang={locale}
            onLangChange={handleLangChange}
            subtitle={t("patient.hero_subtitle")}
          />
        </div>

        {/* Mobile greeting */}
        <div className="lg:hidden mb-6 space-y-3">
          <h1
            className="font-display text-4xl leading-[1.08]"
            style={{ color: "var(--color-text)" }}
          >
            {locale === "ar-TN" ? "مرحبا" : locale === "fr" ? "Bonjour" : locale === "zh" ? "你好" : "Hi"},{" "}
            {view.patientFirstName}.
          </h1>
          <p className="font-sans text-base leading-relaxed" style={{ color: "var(--color-muted-2)" }}>
            {t("patient.hero_subtitle")}
          </p>
        </div>

        {/* Urgency banner */}
        {view.urgency !== "NO_FU" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 landing-panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 text-xl font-bold font-sans"
                style={{
                  background: `color-mix(in oklch, ${urgencyColor} 15%, transparent)`,
                  color: urgencyColor,
                }}
              >
                {view.urgency === "URGENT" ? "!" : view.urgency === "SHORT" ? "~" : "✓"}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="font-sans text-base sm:text-lg font-semibold leading-tight"
                  style={{ color: urgencyColor }}
                >
                  {URGENCY_MSG[view.urgency]?.[locale] ?? URGENCY_MSG[view.urgency]?.["en"]}
                </p>
                <p className="font-sans text-sm mt-0.5" style={{ color: "var(--color-muted-2)" }}>
                  {view.isScheduled && view.scheduledFor
                    ? `Booked · ${view.scheduledFor}`
                    : view.recommendedTimeframe}
                </p>
              </div>
            </div>
            {!view.isScheduled && (
            <button
              onClick={() => router.push(`/p/${token}/scheduling`)}
              className="btn-accent shrink-0 w-full sm:w-auto justify-center !rounded-xl !py-3 !px-5 font-sans font-semibold"
            >
              {t("patient.book_now")}
              <ChevronRight className="h-4 w-4" />
            </button>
            )}
          </motion.div>
        )}

        <div className="lg:grid lg:grid-cols-[2fr_3fr] lg:gap-8 space-y-5 lg:space-y-0">
          <div className="lg:sticky lg:top-6 lg:h-fit">
            <FindingCard
              finding={exp.findingSimple}
              sliceUrl={view.sliceUrl}
              slices={scanSlices}
              doctorViewLabel={t("patient.show_doctor_view")}
              hideDoctorViewLabel={t("patient.hide_doctor_view")}
              heading={t("patient.what_we_found")}
              variant="landing"
            />
          </div>

          <div className="space-y-5">
            <MeaningCard
              tier={view.urgency}
              paragraph1={exp.paragraph1}
              paragraph2={exp.paragraph2}
              paragraph3={exp.paragraph3}
              heading={t("patient.what_this_means")}
              variant="landing"
            />

            <NextStepsTimeline
              steps={exp.steps}
              heading={t("patient.what_happens_next")}
              bookLabel={t("patient.book_now")}
              onBook={() => router.push(`/p/${token}/scheduling`)}
              variant="landing"
            />

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.32 }}
              className="landing-panel rounded-2xl p-5 sm:p-6 space-y-5 font-sans"
              aria-labelledby="questions-heading"
            >
              <h2
                id="questions-heading"
                className="font-display text-2xl sm:text-[1.65rem] leading-tight"
                style={{ color: "var(--color-text)" }}
              >
                {t("patient.questions")}
              </h2>

              <div className="space-y-2">
                <a
                  href="tel:5557322255"
                  className="flex items-center gap-4 rounded-xl px-4 py-3.5 text-base font-medium transition-colors landing-panel-muted hover:bg-white/[0.06]"
                  style={{ color: "var(--color-text)" }}
                >
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--color-routine-bg)" }}
                  >
                    <Phone className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
                  </div>
                  {t("patient.call_us")}
                  <ChevronRight className="h-4 w-4 ms-auto" style={{ color: "var(--color-muted-2)" }} />
                </a>
                <a
                  href="mailto:nurse@recall.com"
                  className="flex items-center gap-4 rounded-xl px-4 py-3.5 text-base font-medium transition-colors landing-panel-muted hover:bg-white/[0.06]"
                  style={{ color: "var(--color-text)" }}
                >
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--color-routine-bg)" }}
                  >
                    <Mail className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
                  </div>
                  {t("patient.email_nurse")}
                  <ChevronRight className="h-4 w-4 ms-auto" style={{ color: "var(--color-muted-2)" }} />
                </a>
              </div>

              <div className="border-t pt-5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Share2 className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    {t("patient.share_family")}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleCopyFamilyLink}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors landing-panel-muted hover:bg-white/[0.06]"
                    style={{ color: "var(--color-text)" }}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" style={{ color: "var(--color-success)" }} />
                        <span style={{ color: "var(--color-success)" }}>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        {t("patient.copy_family_link")}
                      </>
                    )}
                  </button>
                  <Link
                    href={`/p/${token}/send-to-family`}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold btn-accent !rounded-xl"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {t("patient.text_to_someone")}
                  </Link>
                </div>
              </div>
            </motion.section>

            <footer
              className="text-center space-y-1.5 pb-4 font-sans border-t pt-6"
              style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--color-muted-2)" }}
            >
              <p className="text-sm leading-relaxed">{t("patient.disclaimer")}</p>
              <p className="text-xs">{t("patient.powered_by")}</p>
            </footer>
          </div>
        </div>
      </main>

      {/* Mobile sticky bottom CTA */}
      {view.urgency !== "NO_FU" && !view.isScheduled && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden px-4 py-3 z-20 glass-header">
          <button
            onClick={() => router.push(`/p/${token}/scheduling`)}
            className="btn-accent w-full justify-center !rounded-xl !py-4 text-base font-semibold font-sans"
          >
            <Calendar className="h-5 w-5" />
            {t("patient.book_now")} →
          </button>
        </div>
      )}
    </div>
  );
}
