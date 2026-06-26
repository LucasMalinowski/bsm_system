"use client";

import { useState, useEffect } from "react";
import type { Equipment, CalibrationDocument, CalibrationPoint } from "@/types";

interface Props {
  equipment: Equipment;
  calibrationPoints: CalibrationPoint[];
  onClose: () => void;
  onSuccess: () => void;
}

export function RegisterCalibrationModal({ equipment, calibrationPoints, onClose, onSuccess }: Props) {
  const [templates, setTemplates] = useState<CalibrationDocument[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calibration-documents")
      .then((r) => r.json())
      .then(({ data }) => setTemplates(data ?? []))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      let childStoragePath: string | null = null;

      if (selectedTemplate) {
        const res = await fetch(`/api/equipment/${equipment.id}/calibrations/child-spreadsheet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_doc_id: selectedTemplate,
            performed_at: performedAt,
          }),
        });
        if (!res.ok) {
          const { error: msg } = await res.json();
          throw new Error(msg ?? "Erro ao gerar planilha");
        }
        const { data } = await res.json();
        childStoragePath = data.storage_path;
      }

      const res = await fetch(`/api/equipment/${equipment.id}/calibrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_doc_id: selectedTemplate || null,
          performed_at: performedAt,
          notes: notes || null,
          cost: cost ? Number(cost) : null,
          child_storage_path: childStoragePath,
        }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? "Erro ao registrar calibração");
      }

      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[20px] overflow-hidden flex flex-col"
        style={{ width: 520, maxWidth: "calc(100vw - 32px)", maxHeight: "90vh", boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <div>
            <span className="text-[16px] font-bold text-gray-900">Registrar Calibração</span>
            <p className="text-[12px] text-gray-400 mt-0.5">{equipment.name} · {equipment.internal_code}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {/* Equipment summary */}
          <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Dados do Equipamento</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
              <span className="text-gray-500">Modelo</span><span className="text-gray-900 font-medium">{equipment.model ?? "—"}</span>
              <span className="text-gray-500">Marca</span><span className="text-gray-900 font-medium">{equipment.brand ?? "—"}</span>
              <span className="text-gray-500">Nº Série</span><span className="text-gray-900 font-medium">{equipment.serial_number ?? "—"}</span>
              <span className="text-gray-500">Periodicidade</span><span className="text-gray-900 font-medium capitalize">{equipment.calibration_periodicity?.replace("_", "-") ?? "—"}</span>
            </div>
          </div>

          {/* Calibration points */}
          {calibrationPoints.length > 0 && (
            <div>
              <div className="text-[13px] font-semibold text-gray-700 mb-2">Pontos de Calibração</div>
              <div className="rounded-xl border border-gray-200 overflow-hidden text-[12px]">
                <div className="grid grid-cols-[1fr_80px_1fr] bg-gray-50 border-b border-gray-200 px-3 py-2">
                  <span className="font-semibold text-gray-500">Ponto</span>
                  <span className="font-semibold text-gray-500 text-center">Erro (tol.)</span>
                  <span className="font-semibold text-gray-500">Critério</span>
                </div>
                {calibrationPoints.map((p) => (
                  <div key={p.id} className="grid grid-cols-[1fr_80px_1fr] px-3 py-2 border-b border-gray-100 last:border-none">
                    <span className="text-gray-800">{p.point_value}</span>
                    <span className="text-center text-gray-600">{p.error_tolerance ?? "—"}</span>
                    <span className="text-gray-800">{p.criterion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Template select */}
          <div>
            <label className="text-[13px] font-semibold text-gray-700 block mb-1.5">
              Planilha template <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 outline-none focus:border-[#0363a9] transition-all bg-white"
            >
              <option value="">Sem template (só registro)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} (v{t.current_version})</option>
              ))}
            </select>
            {selectedTemplate && (
              <p className="text-[11px] text-[#0363a9] mt-1">
                Uma planilha filha será gerada automaticamente com os dados do equipamento.
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="text-[13px] font-semibold text-gray-700 block mb-1.5">Data da calibração</label>
            <input
              type="date"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] outline-none focus:border-[#0363a9] transition-all"
            />
          </div>

          {/* Cost */}
          <div>
            <label className="text-[13px] font-semibold text-gray-700 block mb-1.5">Custo da Calibração (R$) <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0,00"
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] outline-none focus:border-[#0363a9] transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[13px] font-semibold text-gray-700 block mb-1.5">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observações sobre a calibração realizada..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] outline-none resize-none focus:border-[#0363a9] transition-all"
            />
          </div>

          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 justify-end px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white"
            style={{ background: "var(--brand-primary)", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Registrando..." : "Registrar Calibração"}
          </button>
        </div>
      </div>
    </div>
  );
}
