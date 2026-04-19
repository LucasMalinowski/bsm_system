import type { CompanyTheme } from "@/types";

export function themeToCssVars(theme: CompanyTheme): string {
  return `
    --brand-primary: ${theme.primary_color};
    --brand-secondary: ${theme.secondary_color};
    --brand-accent: ${theme.accent_color ?? "#e0f0fb"};
    --sidebar-bg: ${theme.primary_color};
  `.trim();
}

export const DEFAULT_THEME: CompanyTheme = {
  primary_color: "#0363a9",
  secondary_color: "#008adb",
  accent_color: "#e0f0fb",
  logo_url: null,
};
