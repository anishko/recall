import Link from "next/link";
import { XCircle, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Case flagged for review — Recall",
};

/**
 * /signoff/rejected — shown after a radiologist clicks "No / Flag for review"
 * in the Resend email. Confirms the rejection and offers to open the full case.
 */
export default async function SignoffRejectedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const caseId = sp.case_id;

  return (
    <main
      className="min-h-dvh flex items-center justify-center px-6"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Icon */}
        <div
          className="mx-auto h-20 w-20 rounded-full flex items-center justify-center"
          style={{ background: "var(--color-urgent-bg)" }}
        >
          <XCircle
            className="h-10 w-10"
            style={{ color: "var(--color-urgent)" }}
          />
        </div>

        <div className="space-y-3">
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--color-text)" }}
          >
            Case flagged for review
          </h1>
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--color-muted)" }}
          >
            This case has been flagged and no patient contact will be initiated.
            A senior radiologist will review it shortly.
          </p>
          {caseId && (
            <p
              className="text-sm font-mono"
              style={{ color: "var(--color-muted-2)" }}
            >
              Case ID: {caseId}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {caseId && (
            <Link
              href={`/dashboard/case/${caseId}`}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-colors"
              style={{ background: "var(--color-primary)" }}
            >
              Open full case
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium transition-colors"
            style={{
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-muted)",
            }}
          >
            Back to queue
          </Link>
        </div>

        <p className="text-xs" style={{ color: "var(--color-muted-2)" }}>
          Recall · Decision support only. A radiologist reviews every case.
        </p>
      </div>
    </main>
  );
}
