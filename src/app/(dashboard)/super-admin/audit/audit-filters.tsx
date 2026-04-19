"use client";

import { useRouter } from "next/navigation";
import type { AuditResourceType } from "@/lib/services/audit.service";

const RESOURCE_LABELS: Record<string, string> = {
  equipment: "Equipamento",
  ticket: "Chamado",
  document: "Documento",
  user: "Usuário",
  company: "Empresa",
};

interface AuditFiltersProps {
  companies: { id: string; name: string }[];
  companyId?: string;
  resourceType?: string;
}

export function AuditFilters({ companies, companyId, resourceType }: AuditFiltersProps) {
  const router = useRouter();

  const update = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (companyId) params.set("company_id", companyId);
    if (resourceType) params.set("resource_type", resourceType);
    params.delete("page");
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/super-admin/audit?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
        <select
          value={companyId ?? ""}
          onChange={(e) => update("company_id", e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        >
          <option value="">Todas as empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Recurso</label>
        <select
          value={resourceType ?? ""}
          onChange={(e) => update("resource_type", e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        >
          <option value="">Todos os recursos</option>
          {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
