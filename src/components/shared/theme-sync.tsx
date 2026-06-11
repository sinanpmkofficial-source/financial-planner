"use client";

import { useEffect } from "react";

export function ThemeSync() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return null;
}
