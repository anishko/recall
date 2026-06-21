"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LANGUAGE_LABELS } from "@/lib/case-utils";
import type { Language } from "@/lib/types";

interface PatientView {
  patient_name: string;
  language: Language;
  summary: string;
  recommended_followup?: string;
  timeframe_days?: number;
  booked: boolean;
  booked_slot?: string;
}

export function PatientPortal({ token }: { token: string }) {
  const [data, setData] = useState<PatientView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [familyPhone, setFamilyPhone] = useState("");
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/backend/orchestrator/patient/view?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Invalid or expired link");
        return r.json() as Promise<PatientView>;
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token]);

  async function book() {
    setBooking(true);
    try {
      const r = await fetch(
        `/backend/orchestrator/patient/book?token=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      if (!r.ok) throw new Error("Booking failed");
      const body = (await r.json()) as { booked_slot: string };
      setData((d) =>
        d ? { ...d, booked: true, booked_slot: body.booked_slot } : d,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  async function shareFamily() {
    try {
      const r = await fetch(
        `/backend/orchestrator/patient/family?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ family_phone: familyPhone }),
        },
      );
      if (!r.ok) throw new Error("Share failed");
      const body = (await r.json()) as { family_url: string };
      setShareMsg(`Link copied for family: ${body.family_url}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Share failed");
    }
  }

  if (error) {
    return (
      <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const lang = LANGUAGE_LABELS[data.language] ?? data.language;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">RadRelay</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lang}</p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm leading-relaxed">{data.summary}</p>
          {data.recommended_followup && (
            <p className="text-xs text-muted-foreground">
              Recommended: {data.recommended_followup}
              {data.timeframe_days
                ? ` · within ${data.timeframe_days} days`
                : ""}
            </p>
          )}
        </CardContent>
      </Card>

      {data.booked ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          <CalendarCheck className="h-5 w-5" />
          Follow-up booked: {data.booked_slot}
        </div>
      ) : (
        <Button className="w-full" size="lg" disabled={booking} onClick={book}>
          {booking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarCheck className="h-4 w-4" />
          )}
          Book my follow-up
        </Button>
      )}

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Share2 className="h-4 w-4" />
            Send to my family
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="+1 phone number"
              value={familyPhone}
              onChange={(e) => setFamilyPhone(e.target.value)}
            />
            <Button variant="outline" onClick={shareFamily}>
              Share
            </Button>
          </div>
          {shareMsg && (
            <p className="break-all text-xs text-muted-foreground">{shareMsg}</p>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        If you don&apos;t book here, we&apos;ll call you in your language to help
        schedule.
      </p>
    </div>
  );
}
