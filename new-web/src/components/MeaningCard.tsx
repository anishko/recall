"use client";
import { motion } from "framer-motion";
import { AlertCircle, Clock, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import type { UrgencyTier } from "@/lib/types";

const TIER_CONFIG: Record<UrgencyTier, { icon: typeof AlertCircle; color: string }> = {
  URGENT:  { icon: AlertCircle,  color: "text-[var(--color-urgent)]" },
  SHORT:   { icon: Clock,        color: "text-[var(--color-short)]" },
  ROUTINE: { icon: Info,         color: "text-[var(--color-routine)]" },
  NO_FU:   { icon: CheckCircle2, color: "text-[var(--color-success)]" },
};

interface MeaningCardProps {
  tier: UrgencyTier;
  paragraph1: string;
  paragraph2: string;
  paragraph3: string;
  heading: string;
  variant?: "default" | "landing";
  className?: string;
}

export function MeaningCard({
  tier,
  paragraph1,
  paragraph2,
  paragraph3,
  heading,
  variant = "default",
  className,
}: MeaningCardProps) {
  const { icon: TierIcon, color } = TIER_CONFIG[tier];
  const isLanding = variant === "landing";

  const items = [
    { text: paragraph1, Icon: TierIcon, iconClass: color },
    { text: paragraph2, Icon: Info,     iconClass: "text-[var(--color-primary)]" },
    { text: paragraph3, Icon: CheckCircle2, iconClass: "text-[var(--color-success)]" },
  ].filter((item) => item.text.trim().length > 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.16 }}
      className={cn(
        isLanding
          ? "landing-panel rounded-2xl p-5 sm:p-6 space-y-4"
          : "card-surface p-6 space-y-4",
        className,
      )}
      aria-labelledby="meaning-heading"
    >
      <h2
        id="meaning-heading"
        className={cn(
          isLanding
            ? "font-display text-2xl sm:text-[1.65rem] leading-tight"
            : "text-lg font-semibold",
          "text-[var(--color-text)]",
        )}
      >
        {heading}
      </h2>
      <div className="space-y-3">
        {items.map(({ text, Icon, iconClass }, i) => (
          <div key={i} className="flex gap-3 items-start">
            <Icon
              className={cn("h-5 w-5 shrink-0 mt-0.5", iconClass)}
              aria-hidden="true"
            />
            <p
              className={cn(
                "text-[var(--color-text)] leading-relaxed",
                isLanding ? "font-sans text-sm sm:text-[0.9375rem]" : "text-sm opacity-80",
              )}
            >
              {text}
            </p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
