import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createCompanyService } from "@/lib/services/company.service";
import { forbidden, redirect } from "next/navigation";
import { formatDateTime } from "@/lib/utils/format";
import Link from "next/link";
import { Building2, Plus, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateCompanyDialog } from "./create-company-dialog";
import { ImpersonateButton } from "./impersonate-button";

export default async function CompaniesPage() {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") forbidden();

  const supabase = createSupabaseAdminClient();
  const service = createCompanyService(supabase);
  const companies = await service.listAllWithStats();

  return (
    <div className="p-4 lg:p-7 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Empresas</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {companies.length} empresa{companies.length !== 1 ? "s" : ""} cadastrada{companies.length !== 1 ? "s" : ""}
          </p>
        </div>
        <CreateCompanyDialog>
          <Button className="h-9 rounded-lg px-4 text-[13px] font-semibold">
            <Plus className="h-4 w-4" />
            Nova Empresa
          </Button>
        </CreateCompanyDialog>
      </div>

      <div
        className="bg-white border border-gray-200 rounded-xl overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
      >
        <div className="grid grid-cols-[minmax(280px,1.7fr)_140px_150px_190px_150px] gap-4 border-b border-gray-100 bg-gray-50 px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          <div>Empresa</div>
          <div>Slug</div>
          <div>Usuários</div>
          <div>Criada em</div>
          <div className="text-right">Ações</div>
        </div>

        {companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-3 rounded-2xl bg-blue-50 p-4 text-blue-600">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Nenhuma empresa cadastrada</h2>
            <p className="mt-1 text-sm text-gray-500">
              Crie a primeira empresa para começar a usar o ambiente multi-tenant.
            </p>
          </div>
        ) : (
          companies.map((company) => (
            <div
              key={company.id}
              className="grid grid-cols-[minmax(280px,1.7fr)_140px_150px_190px_150px] gap-4 border-b border-gray-50 px-4 py-4 last:border-b-0 hover:bg-gray-50/70"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="h-11 w-11 rounded-xl flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${company.primary_color}, ${company.secondary_color})` }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-gray-900">{company.name}</p>
                  <p className="truncate text-[12px] text-gray-400">Tenant ativo</p>
                </div>
              </div>

              <div className="flex items-center">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 font-mono text-[11px] text-gray-600">
                  {company.slug}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="rounded-full bg-blue-50 p-1.5 text-blue-600">
                  <Users className="h-3.5 w-3.5" />
                </div>
                {company.user_count} usuário{company.user_count !== 1 ? "s" : ""}
              </div>

              <div className="flex items-center text-sm text-gray-500">
                {formatDateTime(company.created_at)}
              </div>

              <div className="flex items-center justify-end gap-2">
                <Link href={`/super-admin/companies/${company.id}`}>
                  <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-[12px]">
                    <Settings className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                </Link>
                <ImpersonateButton companyId={company.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
