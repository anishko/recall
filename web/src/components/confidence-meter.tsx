import { cn } from "@/lib/utils";
import { CONFIDENCE_THRESHOLD } from "@/lib/case-utils";

export function ConfidenceMeter({
  value,
  className,
}: {
  value: number | null;
  className?: string;
}) {
  if (value === null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const pct = Math.round(value * 100);
  const low = value < CONFIDENCE_THRESHOLD;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            low ? "bg-red-500" : "bg-emerald-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          low ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
        )}
      >
        {pct}%
      </span>
    </div>
  );
}
