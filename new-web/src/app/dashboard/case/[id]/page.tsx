"use client";
import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  User,
  Globe,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useDashboard } from "@/store/useDashboard";
import { SliceCarousel } from "@/components/SliceCarousel";
import { ReportPanel } from "@/components/ReportPanel";
import { ApprovePanel } from "@/components/ApprovePanel";
import { LiveCallStrip } from "@/components/LiveCallStrip";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { MockBadge } from "@/components/MockBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ClinicalEvaluationDashboard } from "@/components/ClinicalEvaluationDashboard";
import type { Case } from "@/lib/types";
import type { ClinicalEvaluationData } from "@/lib/clinicalEvaluation";

const LANG_LABELS: Record<string, string> = {
  en: "English",
  "ar-TN": "Tunisian Arabic",
  fr: "French",
  zh: "Chinese",
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const { cases, approveCase, flagCase } = useDashboard();
  const storeCase = cases.find((c) => c.id === id);

  // If case not in store (direct URL navigation), fetch it individually
  const [fetchedCase, setFetchedCase] = useState<Case | null>(null);
  const [evaluation, setEvaluation] = useState<ClinicalEvaluationData | null>(
    null,
  );
  const [fetchLoading, setFetchLoading] = useState(false);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`recall_eval_${id}`);
      if (cached) {
        setEvaluation(JSON.parse(cached) as ClinicalEvaluationData);
      }
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    if (storeCase || fetchedCase || fetchLoading) return;
    setFetchLoading(true);
    fetch(`/api/cases/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && !data.error) {
          const { evaluation: evalData, ...caseFields } = data as Case & {
            evaluation?: ClinicalEvaluationData;
          };
          setFetchedCase(caseFields as Case);
          if (evalData) setEvaluation(evalData);
        }
      })
      .catch(() => {})
      .finally(() => setFetchLoading(false));
  }, [id, storeCase, fetchedCase, fetchLoading]);

  useEffect(() => {
    if (evaluation || !storeCase) return;
    fetch(`/api/cases/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.evaluation) setEvaluation(data.evaluation as ClinicalEvaluationData);
      })
      .catch(() => {});
  }, [id, storeCase, evaluation]);

  const c = storeCase ?? fetchedCase;

  // Trigger LiveCallStrip if landing from email ?approved=1
  const initiallyApproved = searchParams.get("approved") === "1";
  const [showCallStrip, setShowCallStrip] = useState(initiallyApproved);

  type DetailTab = "evaluation" | "imaging" | "report" | "patient";
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<DetailTab>(() => {
    if (
      tabFromUrl === "imaging" ||
      tabFromUrl === "report" ||
      tabFromUrl === "patient"
    ) {
      return tabFromUrl;
    }
    return "evaluation";
  });

  useEffect(() => {
    if (
      tabFromUrl === "evaluation" ||
      tabFromUrl === "imaging" ||
      tabFromUrl === "report" ||
      tabFromUrl === "patient"
    ) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  if (fetchLoading && !c) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div
          className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--color-primary)" }}
        />
      </div>
    );
  }

  if (!c) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <p style={{ color: "var(--color-muted)" }}>Case not found.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 text-sm hover:underline"
          style={{ color: "var(--color-primary)" }}
        >
          ← Back to queue
        </button>
      </div>
    );
  }

  async function handleApprove() {
    if (!c) return;
    try {
      const res = await fetch(`/api/cases/${c.id}/approve`, { method: "POST" });
      if (!res.ok) return;
      approveCase(c.id);
      setShowCallStrip(true);
    } catch {
      // Backend unreachable — do not update local state (Hard Invariant #1)
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

  return (
    <div className="relative min-h-full" style={{ background: "var(--color-bg)" }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-6 py-3"
        style={{
          background: "color-mix(in oklch, var(--color-surface) 90%, transparent)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: "var(--color-muted)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to queue
        </button>
        <span style={{ color: "var(--color-border)" }}>/</span>
        <span
          className="text-sm font-semibold font-mono"
          style={{ color: "var(--color-text)" }}
        >
          {c.id}
        </span>
        <span style={{ color: "var(--color-muted)" }}>·</span>
        <span className="text-sm" style={{ color: "var(--color-muted)" }}>
          {c.patientName}
        </span>
        <UrgencyBadge tier={c.urgency} size="sm" className="ml-1" />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--color-muted-2)" }}>
            Arrived {timeAgo(c.arrivedAt)}
          </span>
          <ThemeToggle />
        </div>
      </div>

      {/* Risk banner */}
      {isHighRisk && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-6 py-2.5 text-xs font-medium"
          style={{
            background:
              c.urgency === "URGENT"
                ? "var(--color-urgent-bg)"
                : "var(--color-short-bg)",
            borderBottom: `1px solid color-mix(in oklch, ${c.urgency === "URGENT" ? "var(--color-urgent)" : "var(--color-short)"} 30%, transparent)`,
          }}
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
              : `Confidence ${Math.round(c.confidence * 100)}% — below threshold. Human review required.`}
          </span>
        </motion.div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-0 min-h-[calc(100vh-120px)]">
        {/* Left column */}
        <div className="border-r" style={{ borderColor: "var(--color-border)" }}>
          {/* Tab bar */}
          <div
            className="flex border-b px-6"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            {(["evaluation", "imaging", "report", "patient"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors capitalize"
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
              <ClinicalEvaluationDashboard data={evaluation} className="max-w-3xl" />
            )}
            {activeTab === "evaluation" && !evaluation && (
              <div className="flex items-center justify-center py-16">
                <div
                  className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "var(--color-primary)" }}
                />
              </div>
            )}

            {activeTab === "imaging" && (
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--color-muted)" }}
                      >
                        CT Chest · Axial lung window
                      </p>
                      <MockBadge label="demo imaging" />
                    </div>
                    <p
                      className="text-sm font-medium mt-0.5"
                      style={{ color: "var(--color-text)" }}
                    >
                      {c.slices.length} slices · Source: Radiopaedia
                    </p>
                  </div>
                  <a
                    href="https://radiopaedia.org/cases/t2a-lung-cancer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs flex items-center gap-1 hover:underline"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <SliceCarousel slices={c.slices} highlight={c.highlight} />
                <div
                  className="rounded-xl p-3 space-y-2"
                  style={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-muted)" }}
                  >
                    Lung-RADS v2022 classification
                  </p>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    {[
                      { cat: "1", label: "Negative", color: "var(--color-success)" },
                      { cat: "2", label: "Benign", color: "var(--color-routine)" },
                      { cat: "3", label: "Probably benign", color: "var(--color-short)" },
                      {
                        cat: "4B",
                        label: "Suspicious",
                        color: "var(--color-urgent)",
                        active: true,
                      },
                    ].map(({ cat, label, color, active }) => (
                      <div
                        key={cat}
                        className="rounded-lg p-1.5 space-y-0.5"
                        style={{
                          background: active
                            ? `color-mix(in oklch, ${color} 12%, transparent)`
                            : "transparent",
                          border: active
                            ? `1px solid color-mix(in oklch, ${color} 30%, transparent)`
                            : "1px solid var(--color-border)",
                        }}
                      >
                        <p className="text-xs font-bold" style={{ color }}>
                          {cat}
                        </p>
                        <p
                          className="text-[9px] leading-tight"
                          style={{
                            color: active ? color : "var(--color-muted-2)",
                          }}
                        >
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "report" && (
              <div className="max-w-2xl space-y-4">
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
                {/* Demographics */}
                <div
                  className="rounded-xl p-4 space-y-4"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-muted)" }}
                  >
                    Patient profile
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{
                        background: "var(--color-routine-bg)",
                        color: "var(--color-routine)",
                      }}
                    >
                      {c.patientInitials}
                    </div>
                    <div>
                      <p
                        className="font-semibold"
                        style={{ color: "var(--color-text)" }}
                      >
                        {c.patientName}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                        {c.patientAge > 0 ? `${c.patientAge} years old · ` : ""}
                        {LANG_LABELS[c.patientLanguage] ?? "English"}
                      </p>
                    </div>
                  </div>
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

                {/* Patient portal preview */}
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

                {/* Confidence breakdown */}
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <p
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--color-muted)" }}
                    >
                      AI confidence breakdown
                    </p>
                    <MockBadge label="sub-scores demo" />
                  </div>
                  <ConfidenceBar value={c.confidence} />
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
                          <ConfidenceBar value={v} showLabel />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column — sticky actions */}
        <div className="p-6" style={{ background: "var(--color-surface)" }}>
          <div className="sticky top-20">
            <ApprovePanel case_={c} onApprove={handleApprove} onFlag={handleFlag} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCallStrip && (
          <LiveCallStrip case_={c} onClose={() => setShowCallStrip(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
