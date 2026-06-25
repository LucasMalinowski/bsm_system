import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { ReactNode } from "react";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { themeToCssVars, DEFAULT_THEME } from "@/lib/theme/css-vars";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";

// Cache company theme data for 60 seconds per company_id.
// Theme data changes rarely; using unstable_cache avoids a DB round-trip on every
// page navigation while still reflecting settings changes within a minute.
const getCompanyThemeData = unstable_cache(
  async (companyId: string) => {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("companies")
      .select("name,primary_color,secondary_color,accent_color,logo_url")
      .eq("id", companyId)
      .single();
    return data ?? null;
  },
  ["company-theme"],
  { revalidate: 60, tags: ["company-theme"] }
);

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getServerSession();
  if (!user) redirect("/login");

  let theme = DEFAULT_THEME;
  let impersonatedCompanyName: string | null = null;

  if (user.company_id) {
    const company = await getCompanyThemeData(user.company_id);
    if (company) {
      theme = {
        primary_color: company.primary_color,
        secondary_color: company.secondary_color,
        accent_color: company.accent_color,
        logo_url: company.logo_url,
      };
      if (user.impersonating) {
        impersonatedCompanyName = company.name;
      }
    }
  }

  const cssVars = themeToCssVars(theme);

  return (
    <SessionProvider user={user}>
      <ThemeProvider theme={theme}>
        {/* SSR theme injection to prevent FOUC */}
        <style>{`:root { ${cssVars} }`}</style>

        <div className="flex h-screen overflow-hidden bg-[var(--background)]">
          {/* Desktop sidebar */}
          <Sidebar />

          {/* Main area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {impersonatedCompanyName && (
              <ImpersonationBanner companyName={impersonatedCompanyName} />
            )}
            <Topbar />
            <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
              {children}
            </main>
          </div>
        </div>

        {/* Mobile bottom navigation */}
        <MobileNav />
      </ThemeProvider>
    </SessionProvider>
  );
}
