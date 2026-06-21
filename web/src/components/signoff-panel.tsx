"use client";

import { useState } from "react";
import { Check, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Mirrors the radiologist's 1-tap SMS sign-off. In production the gate is
 * server-side: place_patient_call re-checks cases.signoff_status before
 * dialing (CLAUDE.md invariant #1). These controls are a local demo stand-in —
 * they do not mutate any DB. Wiring to the real signed-link endpoint is the
 * voice/API lane's job.
 */
export function SignoffPanel({ patientName }: { patientName: string }) {
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(
    null,
  );

  if (decision === "approved") {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          Approved — call to {patientName} is now unblocked.
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          (Demo only — no call is placed and no record was changed.)
        </p>
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
        <p className="mt-1 text-xs text-muted-foreground">
          (Demo only — no record was changed.)
        </p>
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
            No call is placed until a radiologist approves. The real sign-off
            happens via a 1-tap SMS link — these buttons preview that flow.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => setDecision("approved")}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDecision("rejected")}
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
