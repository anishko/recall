"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, ExternalLink, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Case } from "@/lib/types";
import { UrgencyBadge } from "./UrgencyBadge";
import { ConfidenceBar } from "./ConfidenceBar";

interface ApprovePanelProps {
  case_: Case;
  onApprove: () => void;
  onFlag: (note: string) => void;
  className?: string;
}

type PanelState = "idle" | "calling" | "flagging";

export function ApprovePanel({ case_: c, onApprove, onFlag, className }: ApprovePanelProps) {
  const [state, setState] = useState<PanelState>("idle");
  const [flagNote, setFlagNote] = useState("");
  const [scriptOpen, setScriptOpen] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [epicToast, setEpicToast] = useState(false);

  function handleApprove() {
    setState("calling");
    onApprove();
    setTimeout(() => {
      setEpicToast(true);
      setTimeout(() => setEpicToast(false), 3000);
    }, 2000);
  }

  function handleFlag() {
    if (!flagNote.trim()) return;
    onFlag(flagNote);
    setState("idle");
    setFlagNote("");
  }

  return (
    <div className={cn("space-y-4", className)}>
      <UrgencyBadge tier={c.urgency} size="lg" />

      {/* Key info */}
      <div className="space-y-3">
        <InfoRow label="Primary finding" value={c.finding} />
        <InfoRow label="Guideline applied" value={c.guideline} href={c.guidelineUrl} />
        <InfoRow label="Recommended timeframe" value={c.recommendedTimeframe} />
      </div>

      {/* Confidence */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
          Confidence score
        </p>
        <ConfidenceBar value={c.confidence} />
        <div className="grid grid-cols-3 gap-2 text-center">
          {Object.entries(c.subScores).map(([k, v]) => (
            <div key={k} className="space-y-1">
              <p className="text-[10px] capitalize" style={{ color: "var(--color-muted)" }}>
                {k.replace(/([A-Z])/g, " $1")}
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {Math.round(v * 100)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Patient script preview */}
      <CollapsibleSection label="Patient script preview" open={scriptOpen} onToggle={() => setScriptOpen((o) => !o)}>
        <p className="text-sm leading-relaxed italic" style={{ color: "var(--color-muted)" }}>
          &ldquo;{c.patientScript["en"]}&rdquo;
        </p>
      </CollapsibleSection>

      {/* Reasoning trace */}
      <CollapsibleSection label="Reasoning trace" open={reasoningOpen} onToggle={() => setReasoningOpen((o) => !o)}>
        <pre className="font-mono text-[11px] whitespace-pre-wrap leading-relaxed" style={{ color: "var(--color-muted)" }}>
          {c.reasoningTrace}
        </pre>
      </CollapsibleSection>

      {/* Actions */}
      {state === "idle" && (
        <div className="space-y-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleApprove}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-colors"
            style={{ background: "var(--color-primary)" }}
          >
            <CheckCircle className="h-4 w-4" />
            Approve &amp; call patient
          </motion.button>
          <button
            onClick={() => setState("flagging")}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
            style={{
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-muted)",
            }}
          >
            <AlertTriangle className="h-4 w-4" style={{ color: "var(--color-short)" }} />
            Flag for review
          </button>
          <div className="flex gap-2">
            {["Edit script", "Change urgency", "Add note"].map((label) => (
              <button
                key={label}
                className="flex-1 rounded-lg px-3 py-2 text-xs transition-colors"
                style={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {state === "calling" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{
            background: "var(--color-success-bg)",
            border: "1px solid color-mix(in oklch, var(--color-success) 30%, transparent)",
          }}
        >
          <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--color-success)" }}>
            Calling {c.patientName.split(" ")[0]} now…
          </p>
        </motion.div>
      )}

      {state === "flagging" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <textarea
            value={flagNote}
            onChange={(e) => setFlagNote(e.target.value)}
            placeholder="Add a note for the senior radiologist…"
            rows={3}
            className="w-full rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
            style={{
              border: "1px solid color-mix(in oklch, var(--color-short) 50%, transparent)",
              background: "var(--color-short-bg)",
              color: "var(--color-text)",
              ["--tw-ring-color" as string]: "var(--color-short)",
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleFlag}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              style={{ background: "var(--color-short)" }}
            >
              Send flag
            </button>
            <button
              onClick={() => setState("idle")}
              className="px-4 py-2.5 text-sm transition-colors"
              style={{ color: "var(--color-muted)" }}
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Epic toast */}
      <AnimatePresence>
        {epicToast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-4 right-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-lg z-50"
            style={{ background: "var(--color-text)" }}
          >
            <Check className="h-4 w-4" />
            Forwarded to Epic
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
        {label}
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium hover:underline inline-flex items-center gap-1"
          style={{ color: "var(--color-primary)" }}
        >
          {value}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{value}</p>
      )}
    </div>
  );
}

function CollapsibleSection({
  label, open, onToggle, children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors"
        style={{ color: "var(--color-muted)", background: "var(--color-surface)" }}
        aria-expanded={open}
      >
        {label}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4" style={{ background: "var(--color-surface-2)" }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
