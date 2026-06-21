/** Short case reference for de-identified radiologist UI. */
export function shortCaseRef(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}

/** Strip patient names from text shown in radiologist review (scripts, traces). */
export function redactPatientNames(text: string, patientName?: string): string {
  if (!text) return text;
  let out = text;
  const names = new Set<string>();
  if (patientName && !["Unknown", "Patient", "—"].includes(patientName)) {
    names.add(patientName);
    const first = patientName.split(/\s+/)[0];
    if (first.length >= 2) names.add(first);
  }
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), "the patient");
  }
  return out;
}
