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
}));
