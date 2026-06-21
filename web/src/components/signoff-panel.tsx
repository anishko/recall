"use client";

import { useState } from "react";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

async function decide(caseId: string, action: "approve" | "reject") {
  const res = await fetch(`/backend/orchestrator/signoff/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ case_id: caseId, action }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.detail === "string" ? body.detail : "Sign-off failed",
    );
  }
  return res.json() as Promise<{ status: string; patient_url?: string; outreach?: unknown }>;
}

/**
 * Radiologist approve/reject — mirrors email 1-tap links.
 * Server gate: place_patient_call re-checks signoff_status before dialing.
 */
export function SignoffPanel({
  patientName,
  caseId,
}: {
  patientName: string;
  caseId: string;
}) {
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientUrl, setPatientUrl] = useState<string | null>(null);

  async function onDecide(action: "approve" | "reject") {
    setLoading(true);
    setError(null);
    try {
      const result = await decide(caseId, action);
      setDecision(action === "approve" ? "approved" : "rejected");
      if (result.patient_url) setPatientUrl(result.patient_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (decision === "approved") {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          Approved — outreach to {patientName} is unblocked.
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Voice call placed if Twilio is configured. Patient portal link issued.
        </p>
        {patientUrl && (
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
            {patientUrl}
          </p>
        )}
      </div>
    );
  }

  if (decision === "rejected") {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
          <X className="h-4 w-4" />
          Rejected — no patient contact will be made.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <p className="text-sm font-medium">Radiologist sign-off required</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            No call until approved. Radiologist also receives an email with
            approve/reject links (Resend email).
          </p>
          {error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              disabled={loading}
              onClick={() => onDecide("approve")}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => onDecide("reject")}
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
