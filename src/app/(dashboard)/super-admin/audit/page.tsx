import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAuditService } from "@/lib/services/audit.service";
import { createCompanyService } from "@/lib/services/company.service";
import { forbidden, redirect } from "next/navigation";
import { AuditFilters } from "./audit-filters";
import { AuditTable } from "./audit-table";
import type { AuditResourceType } from "@/lib/services/audit.service";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "Criação", color: "bg-green-100 text-green-800" },
  update: { label: "Atualização", color: "bg-blue-100 text-blue-800" },
  delete: { label: "Exclusão", color: "bg-red-100 text-red-800" },
};

const RESOURCE_LABELS: Record<string, string> = {
  equipment: "Equipamento",
  ticket: "Chamado",
  document: "Documento",
  user: "Usuário",
  company: "Empresa",
};

type SearchParams = {
  company_id?: string;
  resource_type?: string;
  page?: string;
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") forbidden();

  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const companyId = sp.company_id;
  const resourceType = sp.resource_type as AuditResourceType | undefined;
  const limit = 25;

  const supabase = createSupabaseAdminClient();
  const auditService = createAuditService(supabase);
  const companyService = createCompanyService(supabase);

  const [{ data: logs, count }, companies] = await Promise.all([
    auditService.list({ companyId, resourceType, page, limit }),
    companyService.listAll(),
  ]);

  const totalPages = Math.ceil(count / limit);

  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (companyId) params.set("company_id", companyId);
    if (resourceType) params.set("resource_type", resourceType);
    params.set("page", String(p));
    return `/super-admin/audit?${params.toString()}`;
  };

  return (
    <div className="p-4 lg:p-7 flex flex-col gap-5">
      <div>
        <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Auditoria</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Histórico global de alterações do sistema</p>
      </div>

      <AuditFilters
        companies={companies}
        companyId={companyId}
        resourceType={resourceType}
      />

      <AuditTable
        logs={logs}
        actionLabels={ACTION_LABELS}
        resourceLabels={RESOURCE_LABELS}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{count} registros no total</span>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={buildPageUrl(page - 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
                Anterior
              </a>
            )}
            <span className="rounded-lg bg-gray-100 px-3 py-1.5">{page} / {totalPages}</span>
            {page < totalPages && (
              <a href={buildPageUrl(page + 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
                Próxima
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
