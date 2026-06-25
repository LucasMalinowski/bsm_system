import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCompanyService } from "@/lib/services/company.service";
import { isAdmin, isSuperAdmin } from "@/lib/auth/permissions";
import { forbidden, redirect } from "next/navigation";
import { SettingsClient } from "@/components/admin/settings-client";

export default async function SettingsPage() {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role === "super_admin" && !user.impersonating) redirect("/super-admin/companies");
  if (!isAdmin(user)) forbidden();
  if (!user.company_id) forbidden();

  const supabase = await createSupabaseServerClient();
  const service = createCompanyService(supabase);
  const company = await service.getById(user.company_id!);

  if (!company) forbidden();

  return (
    <SettingsClient
      companyId={company.id}
      companyName={company.name}
      cnpj={(company as { cnpj?: string }).cnpj ?? ""}
      isFullAdmin={isSuperAdmin(user)}
      currentTheme={{
        primary_color: company.primary_color,
        secondary_color: company.secondary_color,
        accent_color: company.accent_color,
        logo_url: company.logo_url,
      }}
    />
  );
}
