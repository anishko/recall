"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, X } from "lucide-react";
import type { Case } from "@/lib/types";

type CallState = "ringing" | "connected" | "talking" | "scheduled" | "ended";

const STATE_LABELS: Record<CallState, string> = {
  ringing: "Ringing…",
  connected: "Connected",
  talking: "Talking",
  scheduled: "Appointment scheduled",
  ended: "Call ended",
};

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

  useEffect(() => {
    const timers = [
      setTimeout(() => setCallState("connected"), 2500),
      setTimeout(() => setCallState("talking"), 4000),
      setTimeout(() => setCallState("scheduled"), 12000),
    ];
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
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
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
      </div>
    </motion.div>
  );
}
