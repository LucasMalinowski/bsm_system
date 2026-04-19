import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCompanyService } from "@/lib/services/company.service";
import { isAdmin } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeEditor } from "@/components/admin/theme-editor";
import { LogoUpload } from "@/components/admin/logo-upload";

export default async function SettingsPage() {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role === "super_admin") redirect("/super-admin/companies");
  if (!isAdmin(user)) redirect("/dashboard");
  if (!user.company_id) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const service = createCompanyService(supabase);
  const company = await service.getById(user.company_id!);

  if (!company) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Logo da Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <LogoUpload companyId={company.id} currentLogoUrl={company.logo_url} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identidade Visual</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeEditor companyId={company.id} currentTheme={{
            primary_color: company.primary_color,
            secondary_color: company.secondary_color,
            accent_color: company.accent_color,
            logo_url: company.logo_url,
          }} />
        </CardContent>
      </Card>
    </div>
  );
}
