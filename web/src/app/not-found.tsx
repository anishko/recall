import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function NotFound() {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Case not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This case doesn&apos;t exist or was removed.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Back to all cases
        </Link>
      </div>
    </AppShell>
  );
}
