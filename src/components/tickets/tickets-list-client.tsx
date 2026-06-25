"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NewTicketModal } from "./new-ticket-modal";

const PRIORITY_COLORS: Record<string, string> = {
  low: "#9ca3af", medium: "#3b82f6", high: "#f59e0b", critical: "#ef4444",
};
const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa", medium: "Média", high: "Alta", critical: "Crítica",
};
const PRIORITY_BADGE: Record<string, { bg: string; text: string }> = {
  low:      { bg: "#f3f4f6", text: "#374151" },
  medium:   { bg: "#dbeafe", text: "#1e40af" },
  high:     { bg: "#fef9c3", text: "#854d0e" },
  critical: { bg: "#fee2e2", text: "#b91c1c" },
};
const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  open:        { bg: "#dbeafe", text: "#1e40af", label: "Aberto" },
  in_progress: { bg: "#fef9c3", text: "#854d0e", label: "Em Andamento" },
  waiting:     { bg: "#f3f4f6", text: "#374151", label: "Aguardando" },
  resolved:    { bg: "#dcfce7", text: "#166534", label: "Resolvido" },
  closed:      { bg: "#f3f4f6", text: "#374151", label: "Fechado" },
};

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  assignee?: { name: string } | null;
  equipment?: { id: string; name: string } | null;
}

interface Props {
  tickets: Ticket[];
  total: number;
  totalPages: number;
  page: number;
  canCreate: boolean;
  canDelete?: boolean;
  currentStatus: string;
  userRole: string;
}

const TABS = [
  { id: "all",         label: "Todos" },
  { id: "open",        label: "Abertos" },
  { id: "in_progress", label: "Em Andamento" },
  { id: "resolved",    label: "Resolvidos" },
];

export function TicketsListClient({ tickets, total, totalPages, page, canCreate, canDelete = false, currentStatus, userRole }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteTicket = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDeleteId(null);
        router.refresh();
      }
    } catch {/* ignore */}
    setDeletingId(null);
  };

  const setTab = (id: string) => {
    const params = id === "all" ? "" : `?status=${id}`;
    router.push(`/tickets${params}`);
  };

  return (
    <>
      <div className="p-4 lg:p-7 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Chamados</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">{total} chamado{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}</p>
          </div>
          {canCreate && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--brand-primary)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Novo Chamado
            </button>
          )}
        </div>

        {/* Desktop table with tabs */}
        <div className="hidden lg:block bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-2">
            {TABS.map((t) => {
              const active = (t.id === "all" && !currentStatus) || currentStatus === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="h-11 px-4 border-none bg-none cursor-pointer text-[13px] transition-all duration-150"
                  style={{
                    fontWeight: active ? 600 : 400,
                    color: active ? "#0363a9" : "#6b7280",
                    borderBottom: active ? "2px solid #0363a9" : "2px solid transparent",
                    background: "none",
                    fontFamily: "inherit",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["#", "Título", "Status", "Prioridade", "Responsável", "Data", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-[13px]">Nenhum chamado encontrado</td></tr>
              ) : tickets.map((t) => {
                const ts = STATUS_MAP[t.status] ?? STATUS_MAP.open;
                const pc = PRIORITY_COLORS[t.priority] ?? "#9ca3af";
                const pb = PRIORITY_BADGE[t.priority] ?? PRIORITY_BADGE.low;
                const pl = PRIORITY_LABELS[t.priority] ?? t.priority;
                return (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">#{t.id.slice(0, 6)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/tickets/${t.id}`} className="font-semibold text-gray-900 hover:underline">{t.title}</Link>
                      {t.equipment && <div className="text-[11px] text-gray-400 mt-0.5">{t.equipment.name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" style={{ background: ts.bg, color: ts.text }}>{ts.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pc }} />
                        <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" style={{ background: pb.bg, color: pb.text }}>{pl}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-600">{t.assignee?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-400">{new Date(t.updated_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3">
                      {canDelete && (
                        confirmDeleteId === t.id ? (
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <button
                              onClick={() => deleteTicket(t.id)}
                              disabled={deletingId === t.id}
                              className="text-[11px] text-red-600 font-semibold hover:underline disabled:opacity-50"
                            >
                              {deletingId === t.id ? "..." : "Confirmar"}
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-[11px] text-gray-400 hover:underline">Cancelar</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(t.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Excluir"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                              <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                            </svg>
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <span className="text-[12px] text-gray-500">Página {page} de {totalPages}</span>
              <div className="flex gap-1.5">
                {page > 1 && (
                  <Link href={`?page=${page - 1}${currentStatus ? `&status=${currentStatus}` : ""}`}>
                    <button className="h-8 px-3 text-[12px] font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50">Anterior</button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={`?page=${page + 1}${currentStatus ? `&status=${currentStatus}` : ""}`}>
                    <button className="h-8 px-3 text-[12px] font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50">Próxima</button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile tab pills + cards */}
        <div className="lg:hidden">
          <div className="flex border-b border-gray-200 mb-3">
            {TABS.map((t) => {
              const active = (t.id === "all" && !currentStatus) || currentStatus === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex-1 h-10 text-[12px] border-none bg-none cursor-pointer"
                  style={{ fontWeight: active ? 600 : 400, color: active ? "#0363a9" : "#6b7280", borderBottom: active ? "2px solid #0363a9" : "2px solid transparent", background: "none", fontFamily: "inherit" }}>
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2.5">
            {tickets.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-[13px]">Nenhum chamado encontrado</div>
            ) : tickets.map((t) => {
              const ts = STATUS_MAP[t.status] ?? STATUS_MAP.open;
              const pc = PRIORITY_COLORS[t.priority] ?? "#9ca3af";
              const pl = PRIORITY_LABELS[t.priority] ?? t.priority;
              return (
                <Link key={t.id} href={`/tickets/${t.id}`}>
                  <div className="bg-white border border-gray-200 rounded-[14px] overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ height: 4, background: pc }} />
                    <div className="px-3.5 py-3">
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-[13px] font-semibold text-gray-900 flex-1 pr-2">{t.title}</div>
                        <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-semibold flex-shrink-0" style={{ background: ts.bg, color: ts.text }}>{ts.label}</span>
                      </div>
                      <div className="text-[12px] text-gray-500 mb-2">{t.equipment?.name ?? "—"}</div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-semibold text-gray-500">{pl}</span>
                        <span className="text-[11px] text-gray-400">{new Date(t.updated_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <NewTicketModal open={modalOpen} onClose={() => setModalOpen(false)} userRole={userRole} />
    </>
  );
}
