"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, X } from "lucide-react";
import type { Case } from "@/lib/types";

type CallState = "ringing" | "connected" | "talking" | "scheduled" | "ended";

const STATE_LABELS: Record<CallState, string> = {
  ringing:   "Ringing…",
  connected: "Connected",
  talking:   "Talking",
  scheduled: "Appointment scheduled",
  ended:     "Call ended",
};

const TRANSCRIPT_LINES = [
  "[Recall Agent]: Hello, this is Recall calling on behalf of Dr. Chen…",
  "[Patient]: Yes, hello?",
  "[Recall Agent]: I'm calling about your recent imaging results. I'd like to walk you through what we found…",
  "[Patient]: Oh, okay. Is it serious?",
  "[Recall Agent]: We found a small spot that we want to follow up on. I'll explain everything in simple terms…",
];

interface LiveCallStripProps {
  case_: Case;
  onClose?: () => void;
}

const LANG_LABELS: Record<string, string> = {
  "ar-TN": "Tunisian Arabic",
  zh: "Chinese",
  fr: "French",
  en: "English",
};

export function LiveCallStrip({ case_: c, onClose }: LiveCallStripProps) {
  const [callState, setCallState] = useState<CallState>("ringing");
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setCallState("connected"), 2500));
    timers.push(setTimeout(() => setCallState("talking"), 4000));
    TRANSCRIPT_LINES.forEach((line, i) => {
      timers.push(
        setTimeout(
          () => setTranscriptLines((prev) => [...prev, line]),
          4500 + i * 2200
        )
      );
    });
    timers.push(
      setTimeout(() => setCallState("scheduled"), 4500 + TRANSCRIPT_LINES.length * 2200 + 1000)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const isActive = callState !== "ended";

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-40 shadow-2xl"
      style={{
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background: isActive ? "var(--color-success-bg)" : "var(--color-surface-2)",
              }}
            >
              {callState === "ended" ? (
                <PhoneOff className="h-4 w-4" style={{ color: "var(--color-muted)" }} />
              ) : (
                <Phone
                  className={callState !== "scheduled" ? "h-4 w-4 animate-pulse" : "h-4 w-4"}
                  style={{ color: "var(--color-success)" }}
                />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {c.patientName.split(" ")[0]}
              </p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                {STATE_LABELS[callState]}
                <span
                  className="ml-2 text-[10px] uppercase tracking-wide"
                  style={{ color: "var(--color-muted-2)" }}
                >
                  {LANG_LABELS[c.patientLanguage] ?? "English"}
                </span>
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-full p-1.5 transition-colors"
              style={{ background: "transparent" }}
              aria-label="Close call strip"
            >
              <X className="h-4 w-4" style={{ color: "var(--color-muted)" }} />
            </button>
          )}
        </div>

        {/* Transcript */}
        {transcriptLines.length > 0 && (
          <div
            className="rounded-xl p-3 max-h-28 overflow-y-auto space-y-1"
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
            }}
          >
            {transcriptLines.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-mono leading-relaxed"
                style={{ color: "var(--color-muted)" }}
              >
                {line}
              </motion.p>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
