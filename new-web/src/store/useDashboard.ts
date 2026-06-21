"use client";
import { create } from "zustand";
import type { Case, UrgencyTier, CaseStatus } from "@/lib/types";

type Filter = "all" | "urgent" | "today" | "low_confidence" | "flagged";

const URGENCY_ORDER: Record<UrgencyTier, number> = {
  URGENT: 0,
  SHORT: 1,
  ROUTINE: 2,
  NO_FU: 3,
};

function sortCases(cases: Case[]): Case[] {
  return [...cases].sort(
    (a, b) =>
      URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] ||
      a.arrivedAt.localeCompare(b.arrivedAt),
  );
}

interface DashboardState {
  cases: Case[];
  isLoading: boolean;
  filter: Filter;
  newCaseIds: Set<string>;

  loadCases: () => Promise<void>;
  setFilter: (f: Filter) => void;
  addCase: (c: Case) => void;
  updateCase: (id: string, patch: Partial<Case>) => void;
  approveCase: (id: string) => void;
  flagCase: (id: string) => void;
  clearNewHighlight: (id: string) => void;
  filteredCases: () => Case[];
}

export const useDashboard = create<DashboardState>((set, get) => ({
  cases: [],
  isLoading: true,
  filter: "all",
  newCaseIds: new Set(),

  loadCases: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/cases");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Case[] = await res.json();
      set({ cases: sortCases(data), isLoading: false });
    } catch (err) {
      console.warn("loadCases failed, keeping current state", err);
      set({ isLoading: false });
    }
  },

  setFilter: (filter) => set({ filter }),

  addCase: (c) =>
    set((s) => {
      const newCaseIds = new Set(s.newCaseIds);
      newCaseIds.add(c.id);
      return { cases: sortCases([c, ...s.cases]), newCaseIds };
    }),

  updateCase: (id, patch) =>
    set((s) => ({
      cases: s.cases.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  approveCase: (id) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === id ? { ...c, status: "approved" as CaseStatus } : c,
      ),
    })),

  flagCase: (id) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === id ? { ...c, status: "escalated" as CaseStatus } : c,
      ),
    })),

  clearNewHighlight: (id) =>
    set((s) => {
      const newCaseIds = new Set(s.newCaseIds);
      newCaseIds.delete(id);
      return { newCaseIds };
    }),

  filteredCases: () => {
    const { cases, filter } = get();
    const today = new Date().toDateString();
    switch (filter) {
      case "urgent":
        return cases.filter((c) => c.urgency === "URGENT");
      case "today":
        return cases.filter(
          (c) => new Date(c.arrivedAt).toDateString() === today,
        );
      case "low_confidence":
        return cases.filter((c) => c.confidence < 0.85);
      case "flagged":
        return cases.filter((c) => c.status === "escalated");
      default:
        return cases;
    }
  },
}));
