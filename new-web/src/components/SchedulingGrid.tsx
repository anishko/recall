"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AppointmentSlot } from "@/lib/types";

interface SchedulingGridProps {
  slots: AppointmentSlot[];
  onPick: (slot: AppointmentSlot) => void;
  confirmLabel: string;
  noSlotsLabel: string;
  className?: string;
}

export function SchedulingGrid({ slots, onPick, confirmLabel, noSlotsLabel, className }: SchedulingGridProps) {
  const [selected, setSelected] = useState<AppointmentSlot | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const grouped = slots.reduce<Record<string, AppointmentSlot[]>>((acc, s) => {
    acc[s.date] = [...(acc[s.date] ?? []), s];
    return acc;
  }, {});

  function handleConfirm() {
    if (!selected) return;
    setConfirmed(true);
    onPick(selected);
  }

  if (!slots.length) {
    return <p className="text-sm" style={{ color: "var(--color-muted)" }}>{noSlotsLabel}</p>;
  }

  if (confirmed && selected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 py-8 text-center"
      >
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center"
          style={{ background: "var(--color-success-bg)" }}
        >
          <CheckCircle className="h-7 w-7" style={{ color: "var(--color-success)" }} />
        </div>
        <div>
          <p className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
            You&rsquo;re booked for {selected.date} at {selected.time}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            We&rsquo;ll text you a reminder.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      {Object.entries(grouped).map(([date, daySlots]) => (
        <div key={date}>
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-2.5"
            style={{ color: "var(--color-muted)" }}
          >
            {date}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {daySlots.map((slot) => {
              const isSelected = selected?.id === slot.id;
              return (
                <button
                  key={slot.id}
                  disabled={!slot.available}
                  onClick={() => setSelected(slot)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-center"
                  style={
                    !slot.available
                      ? {
                          background: "var(--color-surface-2)",
                          color: "var(--color-muted-2)",
                          cursor: "not-allowed",
                        }
                      : isSelected
                      ? {
                          background: "var(--color-primary)",
                          color: "#fff",
                          boxShadow: "0 0 0 2px var(--color-primary), 0 0 0 4px var(--color-bg)",
                        }
                      : {
                          background: "var(--color-surface)",
                          color: "var(--color-text)",
                          border: "1px solid var(--color-border)",
                        }
                  }
                  aria-pressed={isSelected}
                  aria-disabled={!slot.available}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <button
              onClick={handleConfirm}
              className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-colors mt-2"
              style={{ background: "var(--color-primary)" }}
            >
              {confirmLabel} — {selected.date} at {selected.time}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
