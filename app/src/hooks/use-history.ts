"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "freeweb-history";
const MAX_ITEMS = 10;

export interface HistoryEntry {
  href: string;
  timestamp: number;
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  const record = useCallback(
    (href: string) => {
      const next = [
        { href, timestamp: Date.now() },
        ...history.filter((h) => h.href !== href),
      ].slice(0, MAX_ITEMS);
      setHistory(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    [history]
  );

  return { history, record };
}
