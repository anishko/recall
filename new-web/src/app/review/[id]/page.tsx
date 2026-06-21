"use client";

import { use, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { ClinicalEvaluationDashboard } from "@/components/ClinicalEvaluationDashboard";
import {
  buildEvaluationFromAnalyze,
  type ClinicalEvaluationData,
} from "@/lib/clinicalEvaluation";

type Decision = "idle" | "error";

function ReviewPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const approveToken = searchParams.get("approve");
  const rejectToken = searchParams.get("reject");

  const [data, setData] = useState<ClinicalEvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState<Decision>("idle");
  const [decisionError, setDecisionError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing review link.");
      setLoading(false);
      return;
    }
    fetch(`/api/review/${id}?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((row) => {
        if (row.error) {
          setError(row.error);
          return;
        }
        setData(buildEvaluationFromAnalyze(row));
      })
      .catch(() => setError("Could not load case review."))
      .finally(() => setLoading(false));
  }, [id, token]);

  function decide(action: "approve" | "reject") {
    const tok = action === "approve" ? approveToken : rejectToken;
    if (!tok) {
      setDecisionError("Missing sign-off token. Use the link from your email.");
      return;
    }
    window.location.href = `/api/signoff/${action}?token=${encodeURIComponent(tok)}`;
  }

  if (loading) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center"
        style={{ background: "var(--color-bg)" }}
      >
        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color: "var(--color-primary)" }}
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center px-6"
        style={{ background: "var(--color-bg)" }}
      >
        <p style={{ color: "var(--color-urgent)" }}>{error || "Case not found"}</p>
      </div>
    );
  }

  const alreadyDecided =
    data.signoffStatus === "approved" || data.signoffStatus === "rejected";

  return (
    <div className="min-h-dvh" style={{ background: "var(--color-bg)" }}>
      <header
        className="px-6 py-4 border-b"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--color-muted)" }}
        >
          Recall · radiologist review
        </p>
        <h1 className="font-display text-xl mt-1" style={{ color: "var(--color-text)" }}>
          Clinical evaluation
        </h1>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        <ClinicalEvaluationDashboard data={data} />

        {decision === "error" && (
          <p className="text-sm" style={{ color: "var(--color-urgent)" }}>
            {decisionError}
          </p>
        )}

        {decision === "idle" && !alreadyDecided && (
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Review the analysis above, then authorize or decline patient follow-up.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => decide("approve")}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white"
                style={{ background: "var(--color-primary)" }}
              >
                <CheckCircle className="h-4 w-4" />
                Approve follow-up
              </button>
              <button
                onClick={() => decide("reject")}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold"
                style={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                  color: "var(--color-muted)",
                }}
              >
                <AlertTriangle className="h-4 w-4" />
                Do not follow up
              </button>
            </div>
          </div>
        )}

        {alreadyDecided && decision === "idle" && (
          <p className="text-sm text-center" style={{ color: "var(--color-muted)" }}>
            This case was already{" "}
            {data.signoffStatus === "approved" ? "approved" : "declined"}.
          </p>
        )}
      </main>
    </div>
  );
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-dvh flex items-center justify-center"
          style={{ background: "var(--color-bg)" }}
        >
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: "var(--color-primary)" }}
          />
        </div>
      }
    >
      <ReviewPageInner params={params} />
    </Suspense>
  );
}
