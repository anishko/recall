import { AlertTriangle, CalendarCheck, PhoneCall, Inbox } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CaseTable } from "@/components/case-table";
import { listCases } from "@/lib/cases";
import { needsAttention, pipelineStage } from "@/lib/case-utils";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const cases = await listCases();

  const attention = cases.filter(needsAttention).length;
  const calling = cases.filter((c) => pipelineStage(c) === "calling").length;
  const booked = cases.filter((c) => pipelineStage(c) === "booked").length;

  const stats = [
    {
      label: "Active cases",
      value: cases.length,
      icon: Inbox,
      chip: "bg-primary/10 text-primary",
      highlight: false,
    },
    {
      label: "Awaiting sign-off",
      value: attention,
      icon: AlertTriangle,
      chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      highlight: attention > 0,
    },
    {
      label: "On call now",
      value: calling,
      icon: PhoneCall,
      chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      highlight: false,
    },
    {
      label: "Follow-ups booked",
      value: booked,
      icon: CalendarCheck,
      chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      highlight: false,
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Cases</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Reports flow in by email. Claude parses, classifies, and drafts —
            then waits for a radiologist before any patient is called.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className={cn(
                "rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
                s.highlight && "border-amber-500/40 ring-1 ring-amber-500/20",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    s.chip,
                  )}
                >
                  <s.icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3 font-heading text-3xl font-semibold tabular-nums">
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <CaseTable cases={cases} />
      </div>
    </AppShell>
  );
}
