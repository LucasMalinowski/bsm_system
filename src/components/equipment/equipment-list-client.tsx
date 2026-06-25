"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EquipmentSlidePanel } from "./equipment-slide-panel";
import { NewEquipmentModal } from "./new-equipment-modal";
import { NewTicketModal } from "@/components/tickets/new-ticket-modal";
import Link from "next/link";

const CAT_COLORS: Record<string, string> = {
  Pesagem: "#0363a9", Óptica: "#7c3aed", Química: "#059669",
  Esterilização: "#dc2626", Separação: "#d97706", Temperatura: "#ea580c", Microbiologia: "#0891b2",
};
const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  active:            { bg: "#dcfce7", text: "#166534", label: "Ativo" },
  inactive:          { bg: "#f3f4f6", text: "#374151", label: "Inativo" },
  under_maintenance: { bg: "#fef9c3", text: "#854d0e", label: "Manutenção" },
  calibration:       { bg: "#dbeafe", text: "#1e40af", label: "Calibração" },
  retired:           { bg: "#fee2e2", text: "#b91c1c", label: "Descartado" },
};

interface Equipment {
  id: string;
  internal_code: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  category?: { name: string } | null;
  status: string;
  location?: string | null;
  next_calibration?: string | null;
  acquisition_date?: string | null;
  history?: Array<{ action: string; description: string; created_at: string; user?: { name: string } | null }>;
}

interface Props {
  equipment: Equipment[];
  total: number;
  totalPages: number;
  page: number;
  canCreate: boolean;
  canDelete?: boolean;
  userRole: string;
}

const STATUS_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Ativo" },
  { id: "under_maintenance", label: "Manutenção" },
  { id: "calibration", label: "Calibração" },
  { id: "inactive", label: "Inativo" },
];

export function EquipmentListClient({ equipment, total, totalPages, page, canCreate, canDelete = false, userRole }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [selected, setSelected] = useState<Equipment | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newTicketEq, setNewTicketEq] = useState<Equipment | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteEquipment = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/equipment/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDeleteId(null);
        router.refresh();
      }
    } catch {/* ignore */}
    setDeletingId(null);
  };

  const currentStatus = searchParams.get("status") ?? "all";
  const currentQuery = searchParams.get("q") ?? "";

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    params.delete("page");
    startTransition(() => router.push(`?${params.toString()}`));
  };

  const openPanel = async (eq: Equipment) => {
    setSelected(eq);
    setPanelOpen(true);
    // Fetch full detail with history
    try {
      const res = await fetch(`/api/equipment/${eq.id}`);
      if (res.ok) {
        const { data } = await res.json();
        setSelected(data);
      }
    } catch {/* ignore */}
  };

  return (
    <>
      <div className="p-4 lg:p-7 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Equipamentos</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">{total} equipamento{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}</p>
          </div>
          {canCreate && (
            <button
              onClick={() => setNewModalOpen(true)}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--brand-primary)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Novo Equipamento
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1 max-w-xs">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <input
              defaultValue={currentQuery}
              onChange={(e) => updateParams({ q: e.target.value })}
              placeholder="Buscar por nome, código ou fabricante..."
              className="w-full h-[38px] rounded-lg border border-gray-300 pl-9 pr-3 text-[13px] text-gray-900 outline-none focus:border-[#0363a9] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] transition-all"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => updateParams({ status: f.id === "all" ? null : f.id })}
                className="h-9 px-3.5 rounded-full text-[12px] font-medium border-none cursor-pointer transition-all duration-150"
                style={{
                  background: currentStatus === f.id || (f.id === "all" && !searchParams.get("status")) ? "var(--brand-primary)" : "#f3f4f6",
                  color: currentStatus === f.id || (f.id === "all" && !searchParams.get("status")) ? "#fff" : "#6b7280",
                  fontFamily: "inherit",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Código", "Equipamento", "Categoria", "Status", "Localização", "Próx. Calibração", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {equipment.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-[13px]">Nenhum equipamento encontrado</td></tr>
              ) : equipment.map((eq, i) => {
                const st = STATUS_MAP[eq.status] ?? STATUS_MAP.inactive;
                return (
                  <tr
                    key={eq.id}
                    onClick={() => openPanel(eq)}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{eq.internal_code}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[var(--brand-primary)]">{eq.name}</div>
                      {(eq.brand || eq.model) && <div className="text-[11px] text-gray-400 mt-0.5">{[eq.brand, eq.model].filter(Boolean).join(" ")}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{eq.category?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-[12px]">
                      <span className="flex items-center gap-1">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {eq.location ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-[12px]">
                      <span className="flex items-center gap-1">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        {eq.next_calibration ? new Date(eq.next_calibration).toLocaleDateString("pt-BR") : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/api/equipment/${eq.id}/qrcode`}
                          target="_blank"
                          className="text-gray-400 hover:text-[var(--brand-primary)] transition-colors p-1 block"
                          title="QR Code"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/>
                            <path d="M21 16h-3v3M21 21h-1M16 16h1v1"/>
                          </svg>
                        </Link>
                        {canDelete && (
                          confirmDeleteId === eq.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteEquipment(eq.id)}
                                disabled={deletingId === eq.id}
                                className="text-[11px] text-red-600 font-semibold hover:underline disabled:opacity-50"
                              >
                                {deletingId === eq.id ? "..." : "Confirmar"}
                              </button>
                              <button onClick={() => setConfirmDeleteId(null)} className="text-[11px] text-gray-400 hover:underline">Cancelar</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(eq.id)}
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <span className="text-[12px] text-gray-500">Página {page} de {totalPages}</span>
              <div className="flex gap-1.5">
                {page > 1 && (
                  <Link href={`?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: String(page - 1) })}`}>
                    <button className="h-8 px-3 text-[12px] font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">Anterior</button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={`?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: String(page + 1) })}`}>
                    <button className="h-8 px-3 text-[12px] font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">Próxima</button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile card list */}
        <div className="lg:hidden flex flex-col gap-2">
          {equipment.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-[13px]">Nenhum equipamento encontrado</div>
          ) : equipment.map((eq) => {
            const color = eq.category?.name ? (CAT_COLORS[eq.category.name] ?? "#0363a9") : "#0363a9";
            const st = STATUS_MAP[eq.status] ?? STATUS_MAP.inactive;
            return (
              <button
                key={eq.id}
                onClick={() => openPanel(eq)}
                className="w-full bg-white border border-gray-200 rounded-[14px] overflow-hidden flex items-center gap-3 text-left cursor-pointer"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "14px 14px 14px 0" }}
              >
                <div style={{ width: 4, height: 60, background: color, borderRadius: "0 3px 3px 0", flexShrink: 0 }} />
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: color + "18" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-gray-900 mb-0.5">{eq.name}</div>
                  <div className="text-[11px] text-gray-400 font-mono mb-1">{eq.internal_code}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex px-2 py-[2px] rounded-full text-[10px] font-semibold" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                    {eq.location && <span className="text-[10px] text-gray-400">{eq.location}</span>}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mr-1"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slide panel */}
      <EquipmentSlidePanel
        equipment={selected}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onOpenTicket={(eq) => {
          setPanelOpen(false);
          setNewTicketEq(eq);
        }}
      />

      {/* New equipment modal */}
      <NewEquipmentModal open={newModalOpen} onClose={() => setNewModalOpen(false)} />

      {/* New ticket modal (from slide panel) */}
      <NewTicketModal
        open={!!newTicketEq}
        onClose={() => setNewTicketEq(null)}
        preselect={newTicketEq?.id}
        userRole={userRole}
      />
    </>
  );
}
