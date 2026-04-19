import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAuditService } from "@/lib/services/audit.service";
import { createCompanyService } from "@/lib/services/company.service";
import { forbidden, redirect } from "next/navigation";
import { formatDateTime } from "@/lib/utils/format";
import { AuditFilters } from "./audit-filters";
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

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Data/hora</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Usuário</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Empresa</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Ação</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Recurso</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const action = ACTION_LABELS[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-800" };
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {log.user?.name ?? <span className="text-gray-400 italic">Sistema</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.company?.name ?? <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${action.color}`}>
                          {action.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {RESOURCE_LABELS[log.resource_type] ?? log.resource_type}
                      </td>
                      <td className="px-4 py-3 text-gray-900 max-w-xs truncate">
                        {log.resource_name ?? <span className="text-gray-400 italic">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{count} registros no total</span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={buildPageUrl(page - 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
              >
                Anterior
              </a>
            )}
            <span className="rounded-lg bg-gray-100 px-3 py-1.5">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={buildPageUrl(page + 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
              >
                Próxima
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
