import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createCompanyService } from "@/lib/services/company.service";
import { forbidden, redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeEditor } from "@/components/admin/theme-editor";
import { LogoUpload } from "@/components/admin/logo-upload";
import { DeleteCompanyButton } from "../delete-company-button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") forbidden();

  const supabase = createSupabaseAdminClient();
  const service = createCompanyService(supabase);
  const company = await service.getById(id);

  if (!company) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/companies" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
          <p className="text-sm text-gray-400 font-mono">{company.slug}</p>
        </div>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Zona de Perigo</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteCompanyButton companyId={company.id} companyName={company.name} />
        </CardContent>
      </Card>
    </div>
  );
}
