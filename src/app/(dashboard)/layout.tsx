import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerSession } from "@/lib/auth/get-session";
import { createCompanyService } from "@/lib/services/company.service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { themeToCssVars, DEFAULT_THEME } from "@/lib/theme/css-vars";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getServerSession();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const companyService = createCompanyService(supabase);

  // Load company theme for SSR injection
  let theme = DEFAULT_THEME;
  let impersonatedCompanyName: string | null = null;

  if (user.company_id) {
    const company = await companyService.getById(user.company_id);
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
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            {impersonatedCompanyName && (
              <ImpersonationBanner companyName={impersonatedCompanyName} />
            )}
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </ThemeProvider>
    </SessionProvider>
  );
}
