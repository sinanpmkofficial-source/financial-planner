"use client";

import { useEffect } from "react";

export function ThemeSync() {
  useEffect(() => {
    // Default to the white-dominant monochrome (light) theme.
    document.documentElement.classList.remove("dark");
  }, []);

  return null;
}
