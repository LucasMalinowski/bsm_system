"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EquipmentStatusBadge } from "@/components/equipment/equipment-status-badge";
import { NewEquipmentModal } from "@/components/equipment/new-equipment-modal";
import { formatDate } from "@/lib/utils/format";
import type { EquipmentStatus } from "@/types";

interface Company { id: string; name: string }
interface EquipmentRow {
  id: string;
  internal_code: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  status: string;
  location?: string | null;
  next_calibration?: string | null;
  category?: { name: string } | null;
  company?: { id: string; name: string } | null;
}

interface Props {
  equipment: EquipmentRow[];
  companies: Company[];
  totalPages: number;
  page: number;
  search: string;
  total: number;
}

export function SAEquipmentClient({ equipment, companies, totalPages, page, search, total }: Props) {
  const router = useRouter();

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteEqName, setDeleteEqName] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  // Create state
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [createCompanyId, setCreateCompanyId] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/equipment/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteId(null);
        router.refresh();
      }
    } catch { /* ignore */ }
    setDeleting(false);
  };

  const handlePickCompany = () => {
    if (!createCompanyId) return;
    setShowCompanyPicker(false);
    setShowCreateModal(true);
  };

  return (
    <>
      {/* Header actions */}
      <div className="flex gap-2 items-center">
        <form method="GET" className="flex w-full gap-2 sm:w-auto">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              name="search"
              defaultValue={search}
              placeholder="Buscar equipamento..."
              className="h-9 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-[var(--brand-primary)] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] sm:w-60"
            />
          </div>
          <button type="submit" className="h-9 rounded-lg bg-[var(--brand-primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90">
            Buscar
          </button>
        </form>
        <button
          onClick={() => { setCreateCompanyId(companies[0]?.id ?? ""); setShowCompanyPicker(true); }}
          className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white flex items-center gap-1.5 flex-shrink-0"
          style={{ background: "var(--brand-primary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Empresa</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Código</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Equipamento</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Categoria</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Localização</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Próx. calibração</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {equipment.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  Nenhum equipamento encontrado
                </td>
              </tr>
            ) : (
              equipment.map((eq) => (
                <tr key={eq.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{eq.company?.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{eq.internal_code}</td>
                  <td className="px-4 py-3">
                    <Link href={`/equipment/${eq.id}`} className="font-medium text-gray-900 hover:text-[var(--brand-primary)] hover:underline">{eq.name}</Link>
                    {eq.brand && <p className="text-xs text-gray-400">{eq.brand} {eq.model}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{eq.category?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <EquipmentStatusBadge status={eq.status as EquipmentStatus} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{eq.location ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(eq.next_calibration)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/equipment/${eq.id}`}
                        className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-[#0363a9] border border-[#0363a9] bg-white hover:bg-blue-50 transition-colors"
                      >
                        Ver
                      </Link>
                      <button
                        onClick={() => { setDeleteId(eq.id); setDeleteEqName(eq.name); }}
                        className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`?page=${page - 1}&search=${search}`} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Anterior</Link>
              )}
              {page < totalPages && (
                <Link href={`?page=${page + 1}&search=${search}`} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Próxima</Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden flex flex-col gap-2">
        {equipment.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            Nenhum equipamento encontrado
          </div>
        ) : (
          equipment.map((eq) => (
            <div key={eq.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/equipment/${eq.id}`} className="truncate text-sm font-semibold text-gray-900 hover:text-[var(--brand-primary)] block">{eq.name}</Link>
                  <p className="mt-0.5 text-[11px] text-gray-400">{eq.company?.name ?? "—"}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-gray-500">{eq.internal_code}</p>
                </div>
                <EquipmentStatusBadge status={eq.status as EquipmentStatus} />
              </div>
              <div className="mt-2 flex gap-2">
                <Link href={`/equipment/${eq.id}`} className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-[#0363a9] border border-[#0363a9] bg-white hover:bg-blue-50 transition-colors">
                  Ver
                </Link>
                <button
                  onClick={() => { setDeleteId(eq.id); setDeleteEqName(eq.name); }}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Company picker overlay */}
      {showCompanyPicker && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          onClick={() => setShowCompanyPicker(false)}
        >
          <div
            className="bg-white rounded-[20px] p-6 flex flex-col gap-4"
            style={{ width: 400, maxWidth: "calc(100vw - 32px)", boxShadow: "0 25px 60px rgba(0,0,0,0.20)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-bold text-gray-900">Selecionar Empresa</span>
              <button onClick={() => setShowCompanyPicker(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <p className="text-[13px] text-gray-500">Escolha a empresa para a qual deseja criar o equipamento.</p>
            <select
              value={createCompanyId}
              onChange={(e) => setCreateCompanyId(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 outline-none focus:border-[#0363a9] bg-white"
            >
              <option value="">Selecionar empresa...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCompanyPicker(false)} className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                disabled={!createCompanyId}
                onClick={handlePickCompany}
                className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white transition-opacity"
                style={{ background: "var(--brand-primary)", opacity: createCompanyId ? 1 : 0.5, cursor: createCompanyId ? "pointer" : "not-allowed" }}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Equipment Modal */}
      <NewEquipmentModal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setCreateCompanyId(""); }}
        companyId={createCompanyId || undefined}
      />

      {/* Delete confirmation overlay */}
      {deleteId && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          onClick={() => !deleting && setDeleteId(null)}
        >
          <div
            className="bg-white rounded-[20px] p-6 flex flex-col gap-4"
            style={{ width: 400, maxWidth: "calc(100vw - 32px)", boxShadow: "0 25px 60px rgba(0,0,0,0.20)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </div>
              <div>
                <p className="text-[15px] font-bold text-gray-900">Excluir Equipamento</p>
                <p className="text-[13px] text-gray-500 mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-[13px] text-gray-700">
              Tem certeza que deseja excluir o equipamento <strong>"{deleteEqName}"</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                disabled={deleting}
                onClick={() => setDeleteId(null)}
                className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                style={{ opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
