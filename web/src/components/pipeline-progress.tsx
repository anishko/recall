import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { pipelineStage } from "@/lib/case-utils";
import type { Case, PipelineStage } from "@/lib/types";

// Canonical happy-path order shown as a vertical stepper. The sign-off step
// doubles as the off-ramp marker for rejected / flagged cases.
const STEPS: { stage: PipelineStage; label: string }[] = [
  { stage: "received", label: "Received" },
  { stage: "parsed", label: "Parsed" },
  { stage: "classified", label: "Classified" },
  { stage: "awaiting_signoff", label: "Sign-off" },
  { stage: "calling", label: "Call placed" },
  { stage: "booked", label: "Follow-up booked" },
];

/** How far the case has progressed along STEPS (0-based index reached). */
function reachedIndex(c: Case): number {
  const stage = pipelineStage(c);
  switch (stage) {
    case "received":
      return 0;
    case "parsed":
      return 1;
    case "classified":
    case "drafted":
      return 2;
    case "flagged": // diverges at classified
      return 2;
    case "awaiting_signoff":
    case "approved":
    case "rejected": // diverges at sign-off
      return 3;
    case "calling":
      return 4;
    case "booked":
      return 5;
    default:
      return 0;
  }
}

export function PipelineProgress({ case: c }: { case: Case }) {
  const stage = pipelineStage(c);
  const reached = reachedIndex(c);
  const rejected = stage === "rejected";
  const flagged = stage === "flagged";
  const isBad = rejected || flagged;

  return (
    <ol>
      {STEPS.map((step, i) => {
        const isLast = i === STEPS.length - 1;
        const before = i < reached;
        const atReached = i === reached;

        // The step where a bad terminal state lands gets the X marker.
        const isBadMarker =
          (rejected && step.stage === "awaiting_signoff") ||
          (flagged && step.stage === "classified" && atReached);

        let node: React.ReactNode;
        let labelClass = "text-muted-foreground";

        if (isBadMarker) {
          node = (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white">
              <X className="h-3.5 w-3.5" />
            </span>
          );
          labelClass = "font-medium text-red-600 dark:text-red-400";
        } else if (before || (atReached && stage === "booked")) {
          node = (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-3.5 w-3.5" />
            </span>
          );
          labelClass = "text-foreground";
        } else if (atReached && !isBad) {
          node = (
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-foreground">
              <span className="h-2 w-2 rounded-full bg-foreground" />
            </span>
          );
          labelClass = "font-medium text-foreground";
        } else {
          node = (
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-muted-foreground/30" />
          );
        }

        const label =
          rejected && step.stage === "awaiting_signoff"
            ? "Rejected by radiologist"
            : flagged && step.stage === "classified" && atReached
              ? "Flagged — held for review"
              : step.label;

        return (
          <li key={step.stage} className="flex gap-3">
            <div className="flex flex-col items-center">
              {node}
              {!isLast && (
                <span
                  className={cn(
                    "min-h-6 w-0.5 flex-1",
                    i < reached && !isBad
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/20",
                  )}
                />
              )}
            </div>
            <div className={cn("pt-0.5 pb-6 text-sm", labelClass)}>{label}</div>
          </li>
        );
      })}
    </ol>
  );
}
