"use client";

import { useEffect, type ReactNode } from "react";
import type { CompanyTheme } from "@/types";

export function ThemeProvider({
  theme,
  children,
}: {
  theme: CompanyTheme | null;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!theme) return;

    const root = document.documentElement;
    root.style.setProperty("--brand-primary", theme.primary_color);
    root.style.setProperty("--brand-secondary", theme.secondary_color);
    if (theme.accent_color) root.style.setProperty("--brand-accent", theme.accent_color);
    root.style.setProperty("--sidebar-bg", theme.primary_color);
  }, [theme]);

  return <>{children}</>;
}
