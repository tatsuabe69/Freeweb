"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "freeweb-favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setFavorites(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  const persist = useCallback((next: string[]) => {
    setFavorites(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const toggle = useCallback(
    (href: string) => {
      persist(
        favorites.includes(href)
          ? favorites.filter((h) => h !== href)
          : [...favorites, href]
      );
    },
    [favorites, persist]
  );

  const isFavorite = useCallback(
    (href: string) => favorites.includes(href),
    [favorites]
  );

  return { favorites, toggle, isFavorite };
}
