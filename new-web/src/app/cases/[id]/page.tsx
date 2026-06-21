import { redirect } from "next/navigation";

/**
 * /cases/[id] — email "Open full case" landing page.
 *
 * The FastAPI backend bakes this URL into Resend emails via WEB_PUBLIC_URL.
 * We redirect to the actual detail view in /dashboard/case/[id], preserving
 * any query params (e.g. ?approved=1&call_sid=…).
 */
export default async function CaseLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const queryParams = new URLSearchParams(sp);
  if (!queryParams.has("view")) {
    queryParams.set("view", "evaluation");
  }
  const query = queryParams.toString();
  redirect(`/dashboard/case/${id}${query ? `?${query}` : ""}`);
}
