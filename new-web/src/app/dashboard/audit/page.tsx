"use client";
import { Fragment, useState, useEffect } from "react";
import { LanguageFlag } from "@/components/LanguageFlag";
import type { AuditCall } from "@/lib/types";

const OUTCOME_COLORS: Record<AuditCall["outcome"], string> = {
  scheduled: "var(--color-success)",
  voicemail: "var(--color-short)",
  refused: "var(--color-urgent)",
  escalated: "var(--color-urgent)",
};

function formatDuration(seconds: number): string {
  if (seconds === 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AuditPage() {
  const [calls, setCalls] = useState<AuditCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((data: AuditCall[]) => {
        setCalls(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div
      className="p-6 space-y-5"
      style={{ background: "var(--color-bg)", minHeight: "100%" }}
    >
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          Call Log
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
          {loading ? "Loading…" : `${calls.length} calls placed`}
        </p>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded-xl animate-pulse"
              style={{ background: "var(--color-surface-2)" }}
            />
          ))}
        </div>
      )}

      {!loading && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          <table
            className="w-full border-collapse text-sm"
            aria-label="Call audit log"
          >
            <thead>
              <tr
                style={{
                  background: "var(--color-surface-2)",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                {["Time", "Patient", "Language", "Duration", "Outcome", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
            {calls.map((call) => {
              const isOpen = expanded === call.id;
              return (
                <Fragment key={call.id}>
                  <tr
                    className="transition-colors cursor-pointer"
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                    onClick={() => setExpanded(isOpen ? null : call.id)}
                    aria-expanded={isOpen}
                  >
                      <td
                        className="py-3 px-4 text-xs"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {formatTs(call.timestamp)}
                      </td>
                      <td
                        className="py-3 px-4 font-semibold"
                        style={{ color: "var(--color-text)" }}
                      >
                        {call.patientInitials}
                      </td>
                      <td className="py-3 px-4">
                        <LanguageFlag lang={call.language} showLabel />
                      </td>
                      <td
                        className="py-3 px-4 font-mono text-sm"
                        style={{ color: "var(--color-text)" }}
                      >
                        {formatDuration(call.duration)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="text-xs font-semibold capitalize"
                          style={{ color: OUTCOME_COLORS[call.outcome] }}
                        >
                          {call.outcome}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          className="text-xs hover:underline"
                          style={{ color: "var(--color-primary)" }}
                          aria-label={
                            isOpen ? "Close transcript" : "View transcript"
                          }
                        >
                          {isOpen ? "Close" : "View →"}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr
                        style={{ background: "var(--color-surface-2)" }}
                      >
                        <td colSpan={6} className="px-4 pb-4 pt-2">
                          <div className="space-y-3">
                            <p
                              className="text-xs font-semibold uppercase tracking-wide"
                              style={{ color: "var(--color-muted)" }}
                            >
                              Transcript
                            </p>
                            <div
                              className="rounded-xl p-3"
                              style={{
                                border: "1px solid var(--color-border)",
                                background: "var(--color-surface)",
                              }}
                            >
                              <pre
                                className="font-mono text-xs leading-relaxed whitespace-pre-wrap"
                                style={{ color: "var(--color-text)" }}
                              >
                                {call.transcript || "No transcript available."}
                              </pre>
                            </div>
                            {call.audioUrl && (
                              <div>
                                <p
                                  className="text-xs font-semibold uppercase tracking-wide mb-1"
                                  style={{ color: "var(--color-muted)" }}
                                >
                                  Audio
                                </p>
                                <audio
                                  controls
                                  src={call.audioUrl}
                                  className="w-full h-8"
                                />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                </Fragment>
              );
            })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
