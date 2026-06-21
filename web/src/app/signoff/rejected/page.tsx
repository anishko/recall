import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export default function SignoffRejectedPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Rejected for review</h1>
        <p className="text-sm text-muted-foreground">
          No patient contact will be made. Review the case on the dashboard.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
    </AppShell>
  );
}
