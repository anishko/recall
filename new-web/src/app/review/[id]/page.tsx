"use client";

import { use, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Legacy email links — redirect to the dashboard case review view. */
function ReviewRedirectInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("token");
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    router.replace(`/dashboard/case/${id}${qs}`);
  }, [id, searchParams, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-black">
      <Loader2
        className="h-8 w-8 animate-spin"
        style={{ color: "var(--color-primary)" }}
      />
    </div>
  );
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-black">
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: "var(--color-primary)" }}
          />
        </div>
      }
    >
      <ReviewRedirectInner params={params} />
    </Suspense>
  );
}
