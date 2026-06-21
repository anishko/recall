"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, CheckCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/types";

const LANG_OPTIONS: { value: Locale; label: string }[] = [
  { value: "en",    label: "English" },
  { value: "ar-TN", label: "Tunisian Arabic (عربي تونسي)" },
  { value: "fr",    label: "French (Français)" },
  { value: "zh",    label: "Chinese (中文)" },
];

interface SendToFamilyFormProps {
  token: string;
  labels: {
    title: string;
    phonePlaceholder: string;
    phoneLabel: string;
    nameLabel: string;
    namePlaceholder: string;
    languageLabel: string;
    consent: string;
    send: string;
    sent: string;
    sentSuffix: string;
    rateLimit: string;
    mockedNote: string;
  };
  className?: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.75rem",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  padding: "0.625rem 0.75rem",
  fontSize: "0.875rem",
  outline: "none",
};

export function SendToFamilyForm({ token, labels, className }: SendToFamilyFormProps) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [lang, setLang] = useState<Locale>("en");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "rate_limit">("idle");
  const [sendCount, setSendCount] = useState(0);

  async function handleSend() {
    if (!phone || !consent || sendCount >= 3) {
      if (sendCount >= 3) setState("rate_limit");
      return;
    }
    setState("sending");
    await new Promise((r) => setTimeout(r, 1200));
    setSendCount((n) => n + 1);
    setState("sent");
    setTimeout(() => setState("idle"), 4000);
  }

  if (state === "rate_limit") {
    return (
      <div
        className={cn("rounded-xl p-4", className)}
        style={{
          background: "var(--color-urgent-bg)",
          border: "1px solid color-mix(in oklch, var(--color-urgent) 30%, transparent)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--color-urgent)" }}>{labels.rateLimit}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <AnimatePresence mode="wait">
        {state === "sent" ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-xl p-4"
            style={{
              background: "var(--color-success-bg)",
              border: "1px solid color-mix(in oklch, var(--color-success) 30%, transparent)",
            }}
          >
            <CheckCircle className="h-5 w-5 shrink-0" style={{ color: "var(--color-success)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--color-success)" }}>
              {labels.sent} {phone}. {labels.sentSuffix}{" "}
              {LANG_OPTIONS.find((l) => l.value === lang)?.label}. {labels.mockedNote}
            </p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 1 }} className="space-y-3">
            {/* Phone */}
            <label className="block">
              <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-muted)" }}>
                {labels.phoneLabel}
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={labels.phonePlaceholder}
                style={inputStyle}
              />
            </label>

            {/* Name */}
            <label className="block">
              <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-muted)" }}>
                {labels.nameLabel}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={labels.namePlaceholder}
                style={inputStyle}
              />
            </label>

            {/* Language */}
            <label className="block">
              <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-muted)" }}>
                {labels.languageLabel}
              </span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Locale)}
                style={inputStyle}
              >
                {LANG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            {/* Consent */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded"
                style={{ accentColor: "var(--color-primary)" }}
              />
              <span className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {labels.consent}
              </span>
            </label>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!phone || !consent || state === "sending"}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all"
              style={{
                background: phone && consent ? "var(--color-primary)" : "var(--color-border)",
                cursor: phone && consent ? "pointer" : "not-allowed",
              }}
            >
              {state === "sending" ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Sending…
                </span>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {labels.send}
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
