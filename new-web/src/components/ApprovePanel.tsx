"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, ExternalLink, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Case } from "@/lib/types";
import { ConfidenceBar } from "./ConfidenceBar";

const CONFIDENCE_CAP = 0.91;

interface ApprovePanelProps {
  case_: Case;
  onApprove: () => Promise<{
    ok: boolean;
    error?: string;
    callStarted?: boolean;
    skippedReason?: string;
  }>;
  onFlag: (note: string) => void;
  className?: string;
  variant?: "default" | "landing";
}

type PanelState = "idle" | "approving" | "calling" | "flagging";

export function ApprovePanel({
  case_: c,
  onApprove,
  onFlag,
  className,
  variant = "default",
}: ApprovePanelProps) {
  const [state, setState] = useState<PanelState>("idle");
  const [flagNote, setFlagNote] = useState("");
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [approveNotice, setApproveNotice] = useState("");

  async function handleApprove() {
    setApproveError("");
    setApproveNotice("");
    setState("approving");
    try {
      const result = await onApprove();
      if (!result.ok) {
        setApproveError(result.error ?? "Approval failed. Check that the backend is running.");
        setState("idle");
        return;
      }
      if (result.callStarted) {
        setState("calling");
        return;
      }
      setApproveNotice(
        result.skippedReason
          ? `Approved, but call was not placed: ${result.skippedReason}`
          : "Approved, but outbound call was not started.",
      );
      setState("idle");
    } catch {
      setApproveError("Could not reach the server. Is the API running?");
      setState("idle");
    }
  }

  function handleFlag() {
    if (!flagNote.trim()) return;
    onFlag(flagNote);
    setState("idle");
    setFlagNote("");
  }

  const landing = variant === "landing";
  const panelCls = landing ? "landing-panel p-4 space-y-3" : "rounded-xl p-4 space-y-3";
  const panelStyle = landing
    ? undefined
    : { border: "1px solid var(--color-border)", background: "var(--color-surface-2)" };
  const labelCls = cn(
    "text-xs font-semibold uppercase tracking-wide",
    landing && "font-sans",
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-3">
        <InfoRow landing={landing} label="Primary finding" value={c.finding} />
        <InfoRow
          landing={landing}
          label="Guideline applied"
          value={c.guideline}
          href={c.guidelineUrl}
        />
        <InfoRow
          landing={landing}
          label="Recommended timeframe"
          value={c.recommendedTimeframe}
        />
      </div>

      <div className={panelCls} style={panelStyle}>
        <p className={labelCls} style={{ color: "var(--color-muted)" }}>
          Confidence score
        </p>
        <ConfidenceBar value={c.confidence} max={CONFIDENCE_CAP} />
        <div className="grid grid-cols-3 gap-2 text-center font-sans">
          {Object.entries(c.subScores).map(([k, v]) => (
            <div key={k} className="space-y-1">
              <p className="text-[10px] capitalize" style={{ color: "var(--color-muted)" }}>
                {k.replace(/([A-Z])/g, " $1")}
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {Math.round(Math.min(v, CONFIDENCE_CAP) * 100)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      <CollapsibleSection
        landing={landing}
        label="Reasoning trace"
        open={reasoningOpen}
        onToggle={() => setReasoningOpen((o) => !o)}
      >
        <pre
          className="font-mono text-[11px] whitespace-pre-wrap leading-relaxed"
          style={{ color: "var(--color-muted)" }}
        >
          {c.reasoningTrace}
        </pre>
      </CollapsibleSection>

      {state === "idle" && (
        <div className={cn("space-y-4", landing && "font-sans")}>
          {approveError && (
            <p
              className="rounded-xl px-3 py-2 text-xs font-medium"
              style={{
                color: "var(--color-urgent)",
                background: "var(--color-short-bg)",
                border: "1px solid color-mix(in oklch, var(--color-short) 40%, transparent)",
              }}
            >
              {approveError}
            </p>
          )}
          {approveNotice && (
            <p
              className="rounded-xl px-3 py-2 text-xs font-medium"
              style={{
                color: "var(--color-short)",
                background: "var(--color-short-bg)",
                border: "1px solid color-mix(in oklch, var(--color-short) 30%, transparent)",
              }}
            >
              {approveNotice}
            </p>
          )}
          {landing ? (
            <div className="flex flex-col gap-4">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleApprove}
                className="btn-accent w-full flex items-center justify-center gap-2 !py-3.5 disabled:opacity-60"
              >
                <CheckCircle className="h-4 w-4" />
                Approve Follow Up
              </motion.button>
              <button
                onClick={() => setState("flagging")}
                className="btn-primary w-full flex items-center justify-center gap-2 !py-3"
              >
                <AlertTriangle className="h-4 w-4" />
                Flag for review
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleApprove}
                className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ background: "var(--color-primary)" }}
              >
                <CheckCircle className="h-4 w-4" />
                Approve Follow Up
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
            </div>
          )}
        </div>
      )}

      {state === "approving" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin shrink-0"
            style={{ borderColor: "var(--color-primary)" }}
          />
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Approving and placing call…
          </p>
        </motion.div>
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
            Calling patient now…
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
    </div>
  );
}

function InfoRow({
  label,
  value,
  href,
  landing = false,
}: {
  label: string;
  value: string;
  href?: string;
  landing?: boolean;
}) {
  return (
    <div>
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wide",
          landing && "font-sans",
        )}
        style={{ color: "var(--color-muted)" }}
      >
        {label}
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "text-sm font-medium hover:underline inline-flex items-center gap-1",
            landing && "font-sans",
          )}
          style={{ color: "var(--color-primary)" }}
        >
          {value}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <p
          className={cn("text-sm font-medium", landing && "font-sans")}
          style={{ color: "var(--color-text)" }}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function CollapsibleSection({
  label,
  open,
  onToggle,
  children,
  landing = false,
}: {
  label: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  landing?: boolean;
}) {
  return (
    <div
      className={cn("overflow-hidden", landing ? "landing-panel" : "rounded-xl")}
      style={landing ? undefined : { border: "1px solid var(--color-border)" }}
    >
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors",
          landing && "font-sans",
        )}
        style={{
          color: "var(--color-muted)",
          background: landing ? "transparent" : "var(--color-surface)",
        }}
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
            <div
              className="px-4 pb-4"
              style={{
                background: landing ? "rgba(255,255,255,0.02)" : "var(--color-surface-2)",
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
