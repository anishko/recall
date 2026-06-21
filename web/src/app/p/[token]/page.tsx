import { PatientPortal } from "@/components/patient-portal";

export default async function PatientPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="min-h-full bg-background px-4 py-10">
      <PatientPortal token={token} />
    </div>
  );
}
