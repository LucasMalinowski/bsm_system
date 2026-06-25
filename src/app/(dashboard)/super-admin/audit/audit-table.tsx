"use client";

import { useState } from "react";
import type { AuditLog } from "@/lib/services/audit.service";
import { AuditDetailPanel } from "@/components/audit/audit-detail-panel";
import { formatDateTime } from "@/lib/utils/format";

interface Props {
  logs: AuditLog[];
  actionLabels: Record<string, { label: string; color: string }>;
  resourceLabels: Record<string, string>;
}

export function AuditTable({ logs, actionLabels, resourceLabels }: Props) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  return (
    <>
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
                  const action = actionLabels[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-800" };
                  const hasDetail = !!(log.old_data || log.new_data);
                  return (
                    <tr
                      key={log.id}
                      onClick={() => hasDetail && setSelectedLog(log)}
                      className="hover:bg-gray-50 transition-colors"
                      style={{ cursor: hasDetail ? "pointer" : undefined }}
                    >
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
                        {resourceLabels[log.resource_type] ?? log.resource_type}
                      </td>
                      <td className="px-4 py-3 text-gray-900 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{log.resource_name ?? <span className="text-gray-400 italic">—</span>}</span>
                          {hasDetail && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="flex-shrink-0">
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog && (
        <AuditDetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </>
  );
}
