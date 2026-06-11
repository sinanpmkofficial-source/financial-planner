"use client";

import { useEffect } from "react";

export function ThemeSync() {
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (dark: boolean) => {
      if (dark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    applyTheme(mq.matches);

    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
    mq.addEventListener("change", handler);

    return () => mq.removeEventListener("change", handler);
  }, []);

  return null;
}
