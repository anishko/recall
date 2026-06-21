"use client";
import Link from "next/link";
import { Users } from "lucide-react";
import { cn } from "@/lib/cn";

interface FamilyViewBannerProps {
  patientFirstName: string;
  bookingLink: string;
  viewingAsLabel: string;
  theyCanBookLabel: string;
  className?: string;
}

export function FamilyViewBanner({
  patientFirstName,
  bookingLink,
  viewingAsLabel,
  theyCanBookLabel,
  className,
}: FamilyViewBannerProps) {
  return (
    <div
      className={cn("flex items-start gap-3 rounded-xl px-4 py-3", className)}
      style={{
        background: "var(--color-routine-bg)",
        border: "1px solid color-mix(in oklch, var(--color-primary) 20%, transparent)",
      }}
      role="note"
    >
      <Users className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--color-primary)" }} />
      <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
        {viewingAsLabel}{" "}
        <strong className="font-semibold" style={{ color: "var(--color-text)" }}>{patientFirstName}</strong>.{" "}
        {theyCanBookLabel}{" "}
        <Link
          href={bookingLink}
          className="font-semibold underline underline-offset-2"
          style={{ color: "var(--color-primary)" }}
        >
          {bookingLink}
        </Link>
      </p>
    </div>
  );
}
