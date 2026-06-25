"use client";

import type { AuditLog } from "@/lib/services/audit.service";

interface Props {
  log: AuditLog;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
};

const RESOURCE_LABELS: Record<string, string> = {
  equipment: "Equipamento",
  ticket: "Chamado",
  document: "Documento",
  user: "Usuário",
  company: "Empresa",
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "string" && v.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(v).toLocaleString("pt-BR");
  }
  return String(v);
}

function DiffTable({ oldData, newData }: { oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  const allKeys = new Set([
    ...Object.keys(oldData ?? {}),
    ...Object.keys(newData ?? {}),
  ]);

  const skipKeys = new Set(["id", "created_at", "updated_at", "company_id", "qr_code_token"]);
  const keys = Array.from(allKeys).filter((k) => !skipKeys.has(k));

  if (keys.length === 0) {
    return <p className="text-[13px] text-gray-400 italic">Sem dados detalhados disponíveis.</p>;
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden text-[13px]">
      <div className="grid grid-cols-[1fr_1fr_1fr] bg-gray-50 border-b border-gray-200">
        <div className="px-3 py-2 font-semibold text-gray-500 text-[11px] uppercase tracking-wide">Campo</div>
        <div className="px-3 py-2 font-semibold text-gray-500 text-[11px] uppercase tracking-wide border-l border-gray-200">Antes</div>
        <div className="px-3 py-2 font-semibold text-gray-500 text-[11px] uppercase tracking-wide border-l border-gray-200">Depois</div>
      </div>
      {keys.map((key) => {
        const oldVal = formatValue(oldData?.[key]);
        const newVal = formatValue(newData?.[key]);
        const changed = oldVal !== newVal;
        return (
          <div
            key={key}
            className="grid grid-cols-[1fr_1fr_1fr] border-b border-gray-100 last:border-none"
            style={{ background: changed ? "rgba(3,99,169,0.03)" : undefined }}
          >
            <div className="px-3 py-2.5 font-medium text-gray-700 font-mono text-[11px]">{key}</div>
            <div
              className="px-3 py-2.5 border-l border-gray-100 text-gray-600 break-all"
              style={{ color: changed && oldVal !== "—" ? "#dc2626" : undefined }}
            >
              {oldVal}
            </div>
            <div
              className="px-3 py-2.5 border-l border-gray-100 text-gray-900 break-all"
              style={{ color: changed && newVal !== "—" ? "#16a34a" : undefined, fontWeight: changed ? 600 : undefined }}
            >
              {newVal}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AuditDetailPanel({ log, onClose }: Props) {
  const actionInfo = {
    create: { label: "Criação", color: "bg-green-100 text-green-800" },
    update: { label: "Atualização", color: "bg-blue-100 text-blue-800" },
    delete: { label: "Exclusão", color: "bg-red-100 text-red-800" },
  }[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-800" };

  return (
    <div
      className="fixed inset-0 z-[400] flex"
      onClick={onClose}
    >
      <div className="flex-1" />
      <div
        className="w-full max-w-[520px] h-full bg-white shadow-[-4px_0_32px_rgba(0,0,0,0.12)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <div className="text-[16px] font-bold text-gray-900">Detalhe da Auditoria</div>
            <div className="text-[12px] text-gray-400 mt-0.5">
              {new Date(log.created_at).toLocaleString("pt-BR")}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Info */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Ação</div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${actionInfo.color}`}>
                {ACTION_LABELS[log.action] ?? log.action}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Módulo</div>
              <div className="text-[13px] font-semibold text-gray-900">{RESOURCE_LABELS[log.resource_type] ?? log.resource_type}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Usuário</div>
              <div className="text-[13px] font-semibold text-gray-900">{log.user?.name ?? <span className="italic text-gray-400">Sistema</span>}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Item</div>
              <div className="text-[13px] font-semibold text-gray-900 truncate">{log.resource_name ?? "—"}</div>
            </div>
          </div>

          {log.company && (
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Empresa</div>
              <div className="text-[13px] text-gray-900">{log.company.name}</div>
            </div>
          )}

          <div>
            <div className="text-[13px] font-bold text-gray-900 mb-3">Diferenças</div>
            <DiffTable oldData={log.old_data} newData={log.new_data} />
          </div>
        </div>
      </div>
    </div>
  );
}
