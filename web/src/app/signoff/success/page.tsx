import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export default function SignoffSuccessPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-emerald-600">Approved</h1>
        <p className="text-sm text-muted-foreground">
          Patient outreach is unblocked. RadRelay will call in their language if
          they don&apos;t book online.
        </p>
        <Button asChild>
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
    </AppShell>
  );
}
