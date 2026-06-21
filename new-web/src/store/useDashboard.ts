"use client";
import { create } from "zustand";
import type { Case, UrgencyTier, CaseStatus } from "@/lib/types";
import { MOCK_CASES } from "@/lib/mockCases";

type Filter = "all" | "urgent" | "today" | "low_confidence" | "flagged";

interface DashboardState {
  cases: Case[];
  filter: Filter;
  newCaseIds: Set<string>;
  setFilter: (f: Filter) => void;
  addCase: (c: Case) => void;
  updateCase: (id: string, patch: Partial<Case>) => void;
  approveCase: (id: string) => void;
  flagCase: (id: string) => void;
  clearNewHighlight: (id: string) => void;
  filteredCases: () => Case[];
}

export const useDashboard = create<DashboardState>((set, get) => ({
  cases: [...MOCK_CASES].sort((a, b) => {
    const order: Record<UrgencyTier, number> = {
      URGENT: 0,
      SHORT: 1,
      ROUTINE: 2,
      NO_FU: 3,
    };
    return order[a.urgency] - order[b.urgency] || a.arrivedAt.localeCompare(b.arrivedAt);
  }),
  filter: "all",
  newCaseIds: new Set(),

  setFilter: (filter) => set({ filter }),

  addCase: (c) =>
    set((s) => {
      const newCaseIds = new Set(s.newCaseIds);
      newCaseIds.add(c.id);
      const order: Record<UrgencyTier, number> = {
        URGENT: 0, SHORT: 1, ROUTINE: 2, NO_FU: 3,
      };
      const cases = [c, ...s.cases].sort(
        (a, b) => order[a.urgency] - order[b.urgency] || a.arrivedAt.localeCompare(b.arrivedAt)
      );
      return { cases, newCaseIds };
    }),

  updateCase: (id, patch) =>
    set((s) => ({
      cases: s.cases.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  approveCase: (id) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === id ? { ...c, status: "approved" as CaseStatus } : c
      ),
    })),

  flagCase: (id) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === id ? { ...c, status: "escalated" as CaseStatus } : c
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
          (c) => new Date(c.arrivedAt).toDateString() === today
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
