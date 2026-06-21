"use client";
import { use, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Clock,
  User,
  Globe,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useDashboard } from "@/store/useDashboard";
import { SliceCarousel } from "@/components/SliceCarousel";
import { ReportPanel } from "@/components/ReportPanel";
import { ApprovePanel } from "@/components/ApprovePanel";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { ClinicalEvaluationDashboard } from "@/components/ClinicalEvaluationDashboard";
import type { Case } from "@/lib/types";
import { mapReviewPayloadToCase } from "@/lib/caseAdapter";
import {
  buildEvaluationFromCase,
  buildEvaluationFromReview,
  type ClinicalEvaluationData,
} from "@/lib/clinicalEvaluation";

const LANG_LABELS: Record<string, string> = {
  en: "English",
  "ar-TN": "Tunisian Arabic",
  fr: "French",
  zh: "Chinese",
};

type CaseTab = "evaluation" | "imaging" | "report" | "patient";

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function initialTab(searchParams: URLSearchParams): CaseTab {
  const view = searchParams.get("view") ?? searchParams.get("tab");
  return view === "evaluation" ? "evaluation" : "imaging";
}

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();

  const { cases, approveCase, flagCase } = useDashboard();
  const storeCase = cases.find((c) => c.id === id);
  const reviewToken = searchParams.get("token");

  const [fetchedCase, setFetchedCase] = useState<Case | null>(null);
  const [fetchedEvaluation, setFetchedEvaluation] =
    useState<ClinicalEvaluationData | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [activeTab, setActiveTab] = useState<CaseTab>(() =>
    initialTab(searchParams),
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("recall_theme", "dark");
  }, []);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`recall_eval_${id}`);
      if (cached) {
        setFetchedEvaluation(JSON.parse(cached) as ClinicalEvaluationData);
      }
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    if (storeCase || fetchedCase || fetchLoading) return;
    setFetchLoading(true);

    const load = reviewToken
      ? fetch(`/api/review/${id}?token=${encodeURIComponent(reviewToken)}`).then(
          (r) => r.json(),
        )
      : fetch(`/api/cases/${id}`).then((r) => (r.ok ? r.json() : null));

    load
      .then((data) => {
        if (!data || data.error) {
          setFetchError(data?.error ?? "Case not found.");
          return;
        }
        if (reviewToken) {
          setFetchedCase(mapReviewPayloadToCase(data as Record<string, unknown>));
          setFetchedEvaluation(
            buildEvaluationFromReview(data as Record<string, unknown>),
          );
        } else {
          const caseData = data as Case & {
            evaluation?: ClinicalEvaluationData;
          };
          setFetchedCase(caseData);
          if (caseData.evaluation) {
            setFetchedEvaluation(caseData.evaluation);
          }
        }
      })
      .catch(() => setFetchError("Could not load case."))
      .finally(() => setFetchLoading(false));
  }, [id, storeCase, fetchedCase, fetchLoading, reviewToken]);

  const c = storeCase ?? fetchedCase;

  const evaluation = useMemo(() => {
    if (fetchedEvaluation) return fetchedEvaluation;
    if (c) return buildEvaluationFromCase(c);
    return null;
  }, [fetchedEvaluation, c]);

  if (fetchLoading && !c) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-black">
        <div
          className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--color-primary)" }}
        />
      </div>
    );
  }

  if (!c) {
    return (
      <div className="min-h-dvh flex flex-col bg-black">
        <div className="px-6 sm:px-10 py-6">
          <Logo href="/" size="header" />
        </div>
        <div className="flex flex-col items-center justify-center flex-1 text-center p-12">
          <p className="font-sans" style={{ color: "var(--color-urgent)" }}>
            {fetchError || "Case not found."}
          </p>
          {!reviewToken && (
            <Link
              href="/dashboard"
              className="mt-4 font-sans text-sm hover:underline"
              style={{ color: "var(--color-primary)" }}
            >
              ← Back to queue
            </Link>
          )}
        </div>
      </div>
    );
  }

  async function handleApprove() {
    if (!c) return { ok: false, error: "Case not loaded" };
    try {
      const res = await fetch(`/api/cases/${c.id}/approve`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string;
        error?: string;
        outreach?: { call?: string; call_sid?: string; reason?: string };
        call_sid?: string;
      };
      if (!res.ok) {
        return {
          ok: false,
          error: data.detail ?? data.error ?? `Approval failed (${res.status})`,
        };
      }
      approveCase(c.id);
      const outreach = data.outreach;
      const callStarted =
        outreach?.call === "started" || Boolean(data.call_sid ?? outreach?.call_sid);
      return {
        ok: true,
        callStarted,
        skippedReason:
          !callStarted && outreach?.reason
            ? outreach.reason.replace(/_/g, " ")
            : undefined,
      };
    } catch {
      return { ok: false, error: "Backend unreachable" };
    }
  }

  async function handleFlag(note: string) {
    if (!c) return;
    const res = await fetch(`/api/cases/${c.id}/flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    }).catch(() => null);
    if (res?.ok) flagCase(c.id);
  }

  const isHighRisk = c.confidence < 0.85 || c.urgency === "URGENT";

  const tabs: CaseTab[] = ["evaluation", "imaging", "report", "patient"];

  return (
    <div className="min-h-dvh flex flex-col bg-black">
      <header className="px-6 sm:px-10 py-6 sm:py-8">
        <Logo href="/" size="header" />
      </header>

      <div className="px-6 sm:px-10 pb-4 space-y-2">
        <p className="tag-eyebrow font-sans w-fit">
          Radiologist review · {c.id}
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1
            className="font-display text-4xl sm:text-5xl leading-tight"
            style={{ color: "var(--color-text)" }}
          >
            Case review
          </h1>
          {!reviewToken && (
            <Link
              href="/dashboard"
              className="font-sans text-sm pb-1 hover:underline"
              style={{ color: "var(--color-muted)" }}
            >
              Back to queue
            </Link>
          )}
        </div>
      </div>

      {isHighRisk && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 sm:mx-10 mb-4 landing-panel px-4 py-2.5 flex items-center gap-3 text-xs font-medium font-sans"
        >
          <AlertTriangle
            className="h-3.5 w-3.5 shrink-0"
            style={{
              color:
                c.urgency === "URGENT"
                  ? "var(--color-urgent)"
                  : "var(--color-short)",
            }}
          />
          <span
            style={{
              color:
                c.urgency === "URGENT"
                  ? "var(--color-urgent)"
                  : "var(--color-short)",
            }}
          >
            {c.urgency === "URGENT"
              ? `URGENT — Requires action within ${c.recommendedTimeframe}.`
              : `Confidence ${Math.round(Math.min(c.confidence, 0.91) * 100)}% — below threshold. Human review required.`}
          </span>
        </motion.div>
      )}

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-3 px-6 sm:px-10 pb-10">
        <div className="landing-panel overflow-hidden min-h-[480px] min-w-0">
          <div
            className="flex border-b font-sans overflow-x-auto"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors capitalize shrink-0"
                style={{
                  borderColor:
                    activeTab === tab
                      ? "var(--color-primary)"
                      : "transparent",
                  color:
                    activeTab === tab
                      ? "var(--color-primary)"
                      : "var(--color-muted)",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "evaluation" && evaluation && (
              <ClinicalEvaluationDashboard
                data={evaluation}
                variant="landing"
                hidePatientName
              />
            )}

            {activeTab === "imaging" && (
              <div className="space-y-4 w-full">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide font-sans"
                      style={{ color: "var(--color-muted)" }}
                    >
                      CT Chest · Axial lung window
                    </p>
                    <p
                      className="text-sm font-medium mt-0.5 font-sans"
                      style={{ color: "var(--color-muted-2)" }}
                    >
                      {c.slices.length} slices · Source: Radiopaedia
                    </p>
                  </div>
                  <a
                    href="https://radiopaedia.org/cases/t2a-lung-cancer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs flex items-center gap-1 hover:underline shrink-0 font-sans"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <SliceCarousel slices={c.slices} className="w-full" />
              </div>
            )}

            {activeTab === "report" && (
              <div className="max-w-2xl space-y-4">
                <div className="landing-panel-muted p-4 space-y-3">
                  <p
                    className="text-xs font-semibold uppercase tracking-wide font-sans"
                    style={{ color: "var(--color-muted)" }}
                  >
                    AI Findings Summary
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        key: "Finding",
                        val: c.finding,
                        icon: AlertTriangle,
                        color: "var(--color-urgent)",
                      },
                      {
                        key: "Guideline",
                        val: c.guideline,
                        icon: CheckCircle,
                        color: "var(--color-routine)",
                      },
                      {
                        key: "Timeframe",
                        val: c.recommendedTimeframe,
                        icon: Clock,
                        color: "var(--color-primary)",
                      },
                    ].map(({ key, val, icon: Icon, color }) => (
                      <div key={key} className="flex items-start gap-2.5">
                        <Icon
                          className="h-3.5 w-3.5 mt-0.5 shrink-0"
                          style={{ color }}
                        />
                        <div>
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wide mr-1.5"
                            style={{ color: "var(--color-muted)" }}
                          >
                            {key}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: "var(--color-text)" }}
                          >
                            {val}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <ReportPanel report={c.reportRaw} entities={c.entities} />
              </div>
            )}

            {activeTab === "patient" && (
              <div className="max-w-xl space-y-4">
                <div
                  className="rounded-xl p-4 space-y-4"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wide font-sans"
                    style={{ color: "var(--color-muted)" }}
                  >
                    Patient profile
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        icon: User,
                        label: "Age",
                        val: c.patientAge > 0 ? `${c.patientAge}y` : "—",
                      },
                      {
                        icon: Globe,
                        label: "Language",
                        val: LANG_LABELS[c.patientLanguage] ?? "English",
                      },
                      {
                        icon: Clock,
                        label: "Case age",
                        val: timeAgo(c.arrivedAt),
                      },
                      {
                        icon: CheckCircle,
                        label: "Status",
                        val:
                          c.status.charAt(0).toUpperCase() + c.status.slice(1),
                      },
                    ].map(({ icon: Icon, label, val }) => (
                      <div
                        key={label}
                        className="rounded-lg p-2.5"
                        style={{ background: "var(--color-surface-2)" }}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Icon
                            className="h-3 w-3"
                            style={{ color: "var(--color-muted)" }}
                          />
                          <p
                            className="text-[10px] font-semibold uppercase tracking-wide"
                            style={{ color: "var(--color-muted)" }}
                          >
                            {label}
                          </p>
                        </div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "var(--color-text)" }}
                        >
                          {val}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-muted)" }}
                  >
                    Patient portal link
                  </p>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--color-text)" }}
                  >
                    The patient will receive this link after approval. It shows a
                    plain-language explanation in their language with appointment
                    scheduling.
                  </p>
                  <Link
                    href="/p/tok_sarah_abc123"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Preview patient portal <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wide font-sans"
                    style={{ color: "var(--color-muted)" }}
                  >
                    AI confidence breakdown
                  </p>
                  <ConfidenceBar value={c.confidence} max={0.91} />
                  <div className="space-y-2">
                    {Object.entries(c.subScores).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-3">
                        <span
                          className="text-xs w-24 capitalize shrink-0"
                          style={{ color: "var(--color-muted)" }}
                        >
                          {k.replace(/([A-Z])/g, " $1")}
                        </span>
                        <div className="flex-1">
                          <ConfidenceBar value={v} showLabel max={0.91} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="landing-panel p-6 min-w-0 xl:max-w-[360px]">
          <div className="sticky top-6">
            <ApprovePanel
              case_={c}
              onApprove={handleApprove}
              onFlag={handleFlag}
              variant="landing"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
