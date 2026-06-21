"use client";
import { useCallback, useEffect, useState } from "react";

/** 0 = hidden, 1 = visible. Persists to localStorage. */
export function useSectionVisibility(
  key: string,
  defaultVisible: 0 | 1 = 0,
) {
  const storageKey = `recall_visibility_${key}`;

  const [visible, setVisibleState] = useState<0 | 1>(defaultVisible);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "0" || stored === "1") {
        setVisibleState(Number(stored) as 0 | 1);
      }
    } catch {
      /* private browsing */
    }
  }, [storageKey]);

  const setVisible = useCallback(
    (next: 0 | 1) => {
      setVisibleState(next);
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  const toggle = useCallback(() => {
    setVisible(visible === 0 ? 1 : 0);
  }, [visible, setVisible]);

  return {
    visible,
    setVisible,
    toggle,
    isShown: visible === 1,
  };
}
