"use client";
import { create } from "zustand";
import type { PatientView, Locale } from "@/lib/types";

interface PatientState {
  view: PatientView | null;
  locale: Locale;
  isLoading: boolean;
  error: string | null;

  setView: (v: PatientView) => void;
  setLocale: (l: Locale) => void;
  setError: (e: string) => void;
  setLoading: (b: boolean) => void;
  loadView: (token: string, familyMode?: boolean) => Promise<void>;
}

export const usePatient = create<PatientState>((set) => ({
  view: null,
  locale: "en",
  isLoading: true,
  error: null,

  setView: (view) => set({ view, isLoading: false }),
  setLocale: (locale) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("recall_locale", locale);
    }
    set({ locale });
  },
  setError: (error) => set({ error, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  loadView: async (token: string, familyMode = false) => {
    set({ isLoading: true, error: null });
    try {
      const url = familyMode
        ? `/api/patient/${encodeURIComponent(token)}?view=family`
        : `/api/patient/${encodeURIComponent(token)}`;
      const res = await fetch(url);
      if (res.status === 404) {
        set({ error: "link_expired", isLoading: false });
        return;
      }
      if (!res.ok) {
        set({ error: "fetch_failed", isLoading: false });
        return;
      }
      const data: PatientView = await res.json();
      // Detect locale from stored preference or view preference
      const storedLocale =
        typeof window !== "undefined"
          ? (localStorage.getItem("recall_locale") as Locale | null)
          : null;
      set({
        view: data,
        isLoading: false,
        locale: storedLocale ?? data.preferredLanguage ?? "en",
      });
    } catch {
      set({ error: "fetch_failed", isLoading: false });
    }
  },
}));
