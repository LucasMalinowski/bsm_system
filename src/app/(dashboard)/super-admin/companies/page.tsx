import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCompanyService } from "@/lib/services/company.service";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils/format";
import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateCompanyDialog } from "./create-company-dialog";
import { ImpersonateButton } from "./impersonate-button";

export default async function CompaniesPage() {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const service = createCompanyService(supabase);
  const companies = await service.listAllWithStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Empresas ({companies.length})</h1>
        <CreateCompanyDialog>
          <Button>
            <Plus className="h-4 w-4" />
            Nova Empresa
          </Button>
        </CreateCompanyDialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex-shrink-0"
                    style={{ background: company.primary_color }}
                  />
                  <div>
                    <CardTitle className="text-base">{company.name}</CardTitle>
                    <p className="text-xs text-gray-400 font-mono">{company.slug}</p>
                  </div>
                </div>
                <Link href={`/super-admin/companies/${company.id}`}>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-1">
              <p>{company.user_count} usuários</p>
              <p className="text-xs text-gray-400">Criada em {formatDateTime(company.created_at)}</p>
              <div className="pt-2">
                <ImpersonateButton companyId={company.id} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
