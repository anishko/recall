import { cn } from "@/lib/utils";
import {
  SEVERITY_LABELS,
  SEVERITY_TONE,
  SIGNOFF_LABELS,
  SIGNOFF_TONE,
  STAGE_LABELS,
  STAGE_TONE,
  TONE_CLASSES,
} from "@/lib/case-utils";
import { pipelineStage } from "@/lib/case-utils";
import type { Case, Severity, SignoffStatus } from "@/lib/types";

function Pill({
  children,
  tone,
  className,
}: {
  children: React.ReactNode;
  tone: keyof typeof TONE_CLASSES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StagePill({ case: c }: { case: Case }) {
  const stage = pipelineStage(c);
  const tone = STAGE_TONE[stage];
  const pulsing = stage === "calling";
  return (
    <Pill tone={tone}>
      {pulsing && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
        </span>
      )}
      {STAGE_LABELS[stage]}
    </Pill>
  );
}

export function SignoffPill({ status }: { status: SignoffStatus }) {
  return <Pill tone={SIGNOFF_TONE[status]}>{SIGNOFF_LABELS[status]}</Pill>;
}

export function SeverityPill({ severity }: { severity: Severity }) {
  return <Pill tone={SEVERITY_TONE[severity]}>{SEVERITY_LABELS[severity]}</Pill>;
}
