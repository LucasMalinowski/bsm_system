"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Equipment, EquipmentHistory, CalibrationPoint, CalibrationRecord } from "@/types";
import { RegisterCalibrationModal } from "@/components/calibration/register-calibration-modal";
import { NewTicketModal } from "@/components/tickets/new-ticket-modal";
import { formatDate } from "@/lib/utils/format";

const EQUIPMENT_STATUSES = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
  { value: "under_maintenance", label: "Em Manutenção" },
  { value: "calibration", label: "Calibração" },
  { value: "retired", label: "Aposentado" },
];

const CAT_COLORS: Record<string, string> = {
  Pesagem: "#0363a9", Óptica: "#7c3aed", Química: "#059669",
  Esterilização: "#dc2626", Separação: "#d97706",
  Temperatura: "#ea580c", Microbiologia: "#0891b2",
};

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  active:            { label: "Ativo",           bg: "rgba(255,255,255,0.25)", text: "#fff" },
  inactive:          { label: "Inativo",          bg: "rgba(255,255,255,0.25)", text: "#fff" },
  under_maintenance: { label: "Em Manutenção",    bg: "rgba(255,255,255,0.25)", text: "#fff" },
  calibration:       { label: "Calibração",       bg: "rgba(255,255,255,0.25)", text: "#fff" },
  retired:           { label: "Aposentado",        bg: "rgba(255,255,255,0.25)", text: "#fff" },
};

type Tab = "dados" | "calibração" | "manutenção" | "docs";

interface Props {
  equipment: Equipment & { history: EquipmentHistory[] };
  canCreate: boolean;
  canUpdate: boolean;
  isSuperAdmin: boolean;
  userRole: string;
}

export function EquipmentDetailClient({ equipment, canCreate, canUpdate, isSuperAdmin, userRole }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dados");
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [calPoints, setCalPoints] = useState<CalibrationPoint[]>([]);
  const [calRecords, setCalRecords] = useState<CalibrationRecord[]>([]);
  const [editingPoints, setEditingPoints] = useState(false);
  const [localPoints, setLocalPoints] = useState<CalibrationPoint[]>([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [savingPoints, setSavingPoints] = useState(false);
  const certInputRef = useRef<HTMLInputElement>(null);
  const [certRecordId, setCertRecordId] = useState<string | null>(null);
  const [uploadingCert, setUploadingCert] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: equipment.name,
    brand: equipment.brand ?? "",
    model: equipment.model ?? "",
    serial_number: equipment.serial_number ?? "",
    tag: equipment.tag ?? "",
    scale: equipment.scale ?? "",
    status: equipment.status,
    location: equipment.location ?? "",
    notes: equipment.notes ?? "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const saveEdit = async () => {
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/equipment/${equipment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name || undefined,
          brand: editForm.brand || null,
          model: editForm.model || null,
          serial_number: editForm.serial_number || null,
          tag: editForm.tag || null,
          scale: editForm.scale || null,
          status: editForm.status,
          location: editForm.location || null,
          notes: editForm.notes || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erro ao salvar");
      }
      setShowEditModal(false);
      router.refresh();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    if (tab === "calibração") {
      fetch(`/api/equipment/${equipment.id}/calibration-points`).then((r) => r.json()).then(({ data }) => { setCalPoints(data ?? []); setLocalPoints(data ?? []); }).catch(() => {});
      fetch(`/api/equipment/${equipment.id}/calibrations`).then((r) => r.json()).then(({ data }) => setCalRecords(data ?? [])).catch(() => {});
    }
  }, [tab, equipment.id]);

  const savePoints = async () => {
    setSavingPoints(true);
    await fetch(`/api/equipment/${equipment.id}/calibration-points`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: localPoints }),
    });
    setCalPoints(localPoints);
    setEditingPoints(false);
    setSavingPoints(false);
  };

  const addPoint = () => setLocalPoints((p) => [...p, { id: crypto.randomUUID(), equipment_id: equipment.id, point_value: "", criterion: "", error_tolerance: null, sort_order: p.length, created_at: "" }]);
  const removePoint = (idx: number) => setLocalPoints((p) => p.filter((_, i) => i !== idx));
  const updatePoint = (idx: number, field: keyof CalibrationPoint, value: unknown) =>
    setLocalPoints((p) => p.map((pt, i) => i === idx ? { ...pt, [field]: value } : pt));

  const uploadCert = async (recordId: string, file: File) => {
    setUploadingCert(true);
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/equipment/${equipment.id}/calibrations/${recordId}/certificate`, { method: "POST", body: fd });
    const res = await fetch(`/api/equipment/${equipment.id}/calibrations`);
    const { data } = await res.json();
    setCalRecords(data ?? []);
    setUploadingCert(false);
  };

  const catName = equipment.category?.name ?? "";
  const color = CAT_COLORS[catName] ?? "#0363a9";
  const st = STATUS_MAP[equipment.status] ?? STATUS_MAP.inactive;
  const tabs: Tab[] = ["dados", "calibração", "manutenção", "docs"];

  const calHistory = equipment.history.filter((h) => h.action === "calibration");
  const maintHistory = equipment.history.filter(
    (h) => h.action === "maintenance" || h.action === "updated"
  );
  const docHistory = equipment.history.filter((h) => h.action === "document_added");

  return (
    <div className="flex flex-col min-h-screen bg-[#f9fafb]">
      {/* Colored header */}
      <div
        className="flex flex-col gap-3 px-4 pb-5"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 60px)",
        }}
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-[10px] self-start transition-opacity hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.2)", border: "none" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="flex gap-3 items-start">
          <div
            className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <div>
            <div className="text-[18px] font-bold text-white leading-tight mb-1">{equipment.name}</div>
            <div className="text-[12px] font-mono mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
              {equipment.internal_code}
            </div>
            <span
              className="inline-block px-2.5 py-[3px] rounded-full text-[11px] font-semibold"
              style={{ background: st.bg, color: st.text }}
            >
              {st.label}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: "none" }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 min-w-[70px] h-11 border-none bg-transparent cursor-pointer capitalize transition-all"
            style={{
              fontSize: 12,
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? "#0363a9" : "#6b7280",
              borderBottom: tab === t ? "2px solid #0363a9" : "2px solid transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 flex flex-col gap-3">
        {tab === "dados" && (
          <>
            {canUpdate && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Editar
                </button>
              </div>
            )}
            {[
              ["Fabricante", equipment.brand],
              ["Modelo", equipment.model],
              ["Número de Série", equipment.serial_number],
              ["Tag", equipment.tag],
              ["Escala", equipment.scale],
              ["Categoria", catName || null],
              ["Localização", equipment.location],
              ["Data de Aquisição", formatDate(equipment.acquisition_date)],
              ["Próxima Calibração", formatDate(equipment.next_calibration)],
              ["Última Calibração", formatDate(equipment.last_calibration)],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="bg-white rounded-xl border border-gray-200 px-3.5 py-3 flex justify-between items-center"
              >
                <span className="text-[13px] text-gray-500">{label}</span>
                <span
                  className="text-[13px] font-semibold text-gray-900"
                  style={{ fontFamily: label === "Número de Série" ? "monospace" : undefined }}
                >
                  {(value as string) || "—"}
                </span>
              </div>
            ))}
            {equipment.notes && (
              <div className="bg-white rounded-xl border border-gray-200 px-3.5 py-3">
                <div className="text-[12px] text-gray-400 mb-1">Observações</div>
                <div className="text-[13px] text-gray-700">{equipment.notes}</div>
              </div>
            )}
          </>
        )}

        {tab === "calibração" && (
          <div className="flex flex-col gap-4">
            {/* Calibration points table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-3 border-b border-gray-200 bg-gray-50">
                <span className="text-[12px] font-bold text-gray-700">Pontos de Calibração</span>
                {!editingPoints ? (
                  <button onClick={() => setEditingPoints(true)} className="text-[11px] text-[#0363a9] font-semibold hover:underline">Editar</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingPoints(false); setLocalPoints(calPoints); }} className="text-[11px] text-gray-500 hover:underline">Cancelar</button>
                    <button onClick={savePoints} disabled={savingPoints} className="text-[11px] text-[#0363a9] font-semibold hover:underline">{savingPoints ? "Salvando..." : "Salvar"}</button>
                  </div>
                )}
              </div>
              {!editingPoints ? (
                localPoints.length === 0 ? (
                  <div className="py-6 text-center text-[12px] text-gray-400">Nenhum ponto cadastrado</div>
                ) : (
                  <div>
                    <div className="grid px-3.5 py-2 bg-gray-50 border-b border-gray-100" style={{ gridTemplateColumns: "1fr 80px 1fr" }}>
                      {["Ponto", "Erro (tol.)", "Critério"].map((h) => <span key={h} className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{h}</span>)}
                    </div>
                    {localPoints.map((p) => (
                      <div key={p.id} className="grid px-3.5 py-2.5 border-b border-gray-100 last:border-none" style={{ gridTemplateColumns: "1fr 80px 1fr" }}>
                        <span className="text-[12px] text-gray-800">{p.point_value}</span>
                        <span className="text-[12px] text-gray-600">{p.error_tolerance ?? "—"}</span>
                        <span className="text-[12px] text-gray-800">{p.criterion}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-2 p-3">
                  {localPoints.map((p, i) => (
                    <div key={p.id} className="grid gap-1.5 items-center" style={{ gridTemplateColumns: "1fr 80px 1fr 28px" }}>
                      <input value={p.point_value} onChange={(e) => updatePoint(i, "point_value", e.target.value)} placeholder="Ponto" className="h-8 rounded-lg border border-gray-300 px-2 text-[12px] outline-none focus:border-[#0363a9]" />
                      <input type="number" value={p.error_tolerance ?? ""} onChange={(e) => updatePoint(i, "error_tolerance", e.target.value ? Number(e.target.value) : null)} placeholder="±0" className="h-8 rounded-lg border border-gray-300 px-2 text-[12px] outline-none focus:border-[#0363a9]" />
                      <input value={p.criterion} onChange={(e) => updatePoint(i, "criterion", e.target.value)} placeholder="Critério" className="h-8 rounded-lg border border-gray-300 px-2 text-[12px] outline-none focus:border-[#0363a9]" />
                      <button onClick={() => removePoint(i)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                  <button onClick={addPoint} className="mt-1 text-[12px] text-[#0363a9] font-semibold hover:underline text-left">+ Adicionar ponto</button>
                </div>
              )}
            </div>

            {/* SA-only: Register calibration */}
            {isSuperAdmin && (
              <button
                onClick={() => setShowRegisterModal(true)}
                className="w-full h-10 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: "var(--brand-primary)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                Registrar Calibração
              </button>
            )}

            {/* Calibration records */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-3.5 py-3 border-b border-gray-200 bg-gray-50">
                <span className="text-[12px] font-bold text-gray-700">Histórico de Calibrações</span>
              </div>
              {calRecords.length === 0 ? (
                <div className="py-6 text-center text-[12px] text-gray-400">Nenhuma calibração registrada</div>
              ) : (
                calRecords.map((r, i) => (
                  <div key={r.id} className="px-3.5 py-3 border-b border-gray-100 last:border-none">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[12px] font-semibold text-gray-900">{r.performed_at}</div>
                        <div className="text-[11px] text-gray-400">Por {r.performer?.name ?? "—"}</div>
                        {r.notes && <div className="text-[11px] text-gray-500 mt-0.5">{r.notes}</div>}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {r.child_storage_path && (
                          <a href={`/api/equipment/${equipment.id}/calibrations/${r.id}/download`} className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-[#0363a9] border border-[#0363a9]/30 hover:bg-[#0363a9]/5 flex items-center">Planilha</a>
                        )}
                        {r.certificate_storage_path ? (
                          <span className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-green-700 border border-green-200 bg-green-50 flex items-center">Certificado ✓</span>
                        ) : isSuperAdmin ? (
                          <>
                            <input ref={certInputRef} type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f && certRecordId) await uploadCert(certRecordId, f); }} />
                            <button
                              onClick={() => { setCertRecordId(r.id); certInputRef.current?.click(); }}
                              disabled={uploadingCert}
                              className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 flex items-center"
                            >
                              {uploadingCert && certRecordId === r.id ? "..." : "Certificado"}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {showRegisterModal && (
              <RegisterCalibrationModal
                equipment={equipment}
                calibrationPoints={calPoints}
                onClose={() => setShowRegisterModal(false)}
                onSuccess={() => {
                  setShowRegisterModal(false);
                  fetch(`/api/equipment/${equipment.id}/calibrations`).then((r) => r.json()).then(({ data }) => setCalRecords(data ?? []));
                }}
              />
            )}
          </div>
        )}

        {tab === "manutenção" && (
          <>
            {maintHistory.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-[13px]">Sem registros de manutenção</div>
            ) : maintHistory.map((h) => (
              <div key={h.id} className="bg-white rounded-xl border border-gray-200 p-3.5">
                <div className="flex justify-between mb-1.5">
                  <span className="text-[12px] text-gray-400 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    {formatDate(h.created_at)}
                  </span>
                </div>
                <div className="text-[13px] font-semibold text-gray-900 mb-1">{h.description}</div>
                {h.user?.name && (
                  <div className="text-[12px] text-gray-500 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    {h.user.name}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {tab === "docs" && (
          <>
            {docHistory.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-[13px]">Nenhum documento anexado</div>
            ) : docHistory.map((h) => (
              <div key={h.id} className="bg-white rounded-xl border border-gray-200 p-3.5 flex gap-3 items-center">
                <div className="w-10 h-10 rounded-[10px] bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-gray-900 truncate">{h.description}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{formatDate(h.created_at)}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Bottom actions */}
      <div
        className="fixed bottom-0 left-0 right-0 lg:sticky flex gap-2.5 px-4 pt-3 pb-5 border-t border-gray-200"
        style={{ background: "rgba(249,250,251,0.95)", backdropFilter: "blur(8px)" }}
      >
        {canCreate && (
          <button
            onClick={() => setShowTicketModal(true)}
            className="flex-1 h-[46px] rounded-xl flex items-center justify-center gap-1.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#0363a9" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"/>
            </svg>
            Abrir Chamado
          </button>
        )}
        <a
          href={`/api/equipment/${equipment.id}/qrcode`}
          download={`${equipment.internal_code}-qr.png`}
          className="w-[46px] h-[46px] rounded-xl flex items-center justify-center border border-gray-200 bg-white transition-colors hover:bg-gray-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/>
            <rect x="16" y="3" width="5" height="5"/>
            <path d="M21 16h-3v3M21 21h-1M16 16h1v1"/>
            <path d="M5.5 5.5h0M5.5 18.5h0M18.5 5.5h0"/>
          </svg>
        </a>
      </div>

      <NewTicketModal
        open={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        preselect={equipment.id}
        userRole={userRole}
      />

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-t-2xl lg:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-gray-900">Editar Equipamento</h2>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {editError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-700">{editError}</div>
            )}

            <div className="flex flex-col gap-3">
              {[
                { key: "name", label: "Nome *", type: "text" },
                { key: "brand", label: "Fabricante", type: "text" },
                { key: "model", label: "Modelo", type: "text" },
                { key: "serial_number", label: "Número de Série", type: "text" },
                { key: "tag", label: "Tag", type: "text" },
                { key: "scale", label: "Escala", type: "text" },
                { key: "location", label: "Localização", type: "text" },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-[12px] font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type={type}
                    value={editForm[key as keyof typeof editForm]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full h-9 rounded-lg border border-gray-300 px-3 text-[13px] outline-none focus:border-[#0363a9]"
                  />
                </div>
              ))}

              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as Equipment["status"] }))}
                  className="w-full h-9 rounded-lg border border-gray-300 px-3 text-[13px] outline-none focus:border-[#0363a9]"
                >
                  {EQUIPMENT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Observações</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] outline-none resize-none focus:border-[#0363a9]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowEditModal(false)} className="flex-1 h-10 rounded-xl border border-gray-300 text-[13px] font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="flex-1 h-10 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50"
                style={{ background: "#0363a9" }}
              >
                {savingEdit ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
