import { AppShell } from "@/components/app-shell";
import { ReportUpload } from "@/components/report-upload";

export default function UploadPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Upload report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hackathon ingestion path — drop a radiology PDF to parse findings,
            classify per clinical guidelines, and draft a follow-up script.
          </p>
        </div>
        <ReportUpload />
      </div>
    </AppShell>
  );
}
