"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const TICKET_TYPES = [
  { id: "maintenance", label: "Manutenção" },
  { id: "calibration", label: "Calibração" },
  { id: "repair", label: "Reparo" },
  { id: "inspection", label: "Inspeção" },
  { id: "other", label: "Outro" },
];

interface Equipment {
  id: string;
  internal_code: string;
  name: string;
  category?: { name: string } | null;
}

const CAT_COLORS: Record<string, string> = {
  Pesagem: "#0363a9", Óptica: "#7c3aed", Química: "#059669",
  Esterilização: "#dc2626", Separação: "#d97706", Temperatura: "#ea580c", Microbiologia: "#0891b2",
};

interface Props {
  open: boolean;
  onClose: () => void;
  preselect?: string;
  companyId?: string;
}

export function NewTicketModal({ open, onClose, preselect }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>(preselect ? [preselect] : []);
  const [type, setType] = useState("maintenance");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  useEffect(() => {
    if (open && equipment.length === 0) {
      fetch("/api/equipment?limit=50").then((r) => r.json()).then((d) => setEquipment(d.data ?? [])).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (preselect) setSelected([preselect]);
  }, [preselect]);

  const reset = () => {
    setStep(1); setSelected(preselect ? [preselect] : []); setType("maintenance");
    setTitle(""); setDesc(""); setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const toggleEq = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const selectedEq = equipment.find((e) => e.id === selected[0]);
      await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || `${TICKET_TYPES.find((t) => t.id === type)?.label ?? "Chamado"} — ${selectedEq?.name ?? "Equipamento"}`,
          description: desc,
          equipment_id: selected[0] ?? null,
          type,
          priority: "medium",
        }),
      });
      setStep(3);
      router.refresh();
      setTimeout(handleClose, 1600);
    } catch { setLoading(false); }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-[20px] overflow-hidden flex flex-col"
        style={{ width: 600, maxWidth: "calc(100vw - 32px)", maxHeight: "90vh", boxShadow: "0 25px 60px rgba(0,0,0,0.20)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 flex-shrink-0">
          <span className="text-[16px] font-bold text-gray-900">Novo Chamado</span>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Stepper */}
          <div className="flex items-center mb-6">
            {[1, 2, 3].map((s, i) => (
              <div key={s} className={`flex items-center ${i < 2 ? "flex-1" : ""}`}>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div
                    className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] font-bold"
                    style={{ background: step >= s ? "#0363a9" : "#f3f4f6", color: step >= s ? "#fff" : "#9ca3af" }}
                  >
                    {step > s ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg> : s}
                  </div>
                  <span className="text-[11px] whitespace-nowrap" style={{ color: step >= s ? "#0363a9" : "#9ca3af", fontWeight: step === s ? 600 : 400 }}>
                    {["Equipamentos", "Detalhes", "Confirmar"][i]}
                  </span>
                </div>
                {i < 2 && <div className="flex-1 h-0.5 mx-2 mb-4 transition-all" style={{ background: step > s ? "#0363a9" : "#e5e7eb" }} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div>
              <p className="text-[13px] text-gray-500 mb-3.5">Selecione um ou mais equipamentos para o chamado</p>
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                {equipment.map((eq) => {
                  const sel = selected.includes(eq.id);
                  const color = eq.category?.name ? (CAT_COLORS[eq.category.name] ?? "#0363a9") : "#0363a9";
                  return (
                    <button
                      key={eq.id}
                      onClick={() => toggleEq(eq.id)}
                      className="bg-white rounded-[10px] p-3 flex items-center gap-2.5 cursor-pointer text-left transition-all"
                      style={{
                        border: sel ? "2px solid #0363a9" : "1px solid #e5e7eb",
                        boxShadow: sel ? "0 0 0 3px rgba(3,99,169,0.10)" : "none",
                        fontFamily: "inherit",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: sel ? "#0363a9" : color + "18", transition: "all 0.15s" }}
                      >
                        {sel ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-gray-900 truncate">{eq.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{eq.internal_code}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[13px] font-semibold text-gray-700 block mb-2">Equipamentos selecionados</label>
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((id) => {
                    const eq = equipment.find((e) => e.id === id);
                    return eq ? <span key={id} className="px-2.5 py-1 rounded-full text-[12px] font-medium" style={{ background: "#e0f0fb", color: "#0363a9" }}>{eq.name}</span> : null;
                  })}
                </div>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-700 block mb-2">Título</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Falha no sensor de temperatura"
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 outline-none focus:border-[#0363a9] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] transition-all"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-700 block mb-2">Tipo de chamado</label>
                <div className="flex flex-wrap gap-2">
                  {TICKET_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className="h-[30px] px-3.5 rounded-full text-[12px] font-medium border-none cursor-pointer transition-all"
                      style={{ background: type === t.id ? "#0363a9" : "#f3f4f6", color: type === t.id ? "#fff" : "#374151", fontFamily: "inherit" }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-700 block mb-2">Descrição</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Descreva o problema ou solicitação com o máximo de detalhes..."
                  className="w-full h-24 rounded-[10px] border border-gray-300 px-3 py-2.5 text-[13px] text-gray-900 outline-none resize-none focus:border-[#0363a9] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] transition-all box-border"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div className="text-[18px] font-bold text-gray-900 mb-2">Chamado aberto com sucesso!</div>
              <div className="text-[14px] text-gray-500 mb-5">O chamado foi registrado e será atribuído em breve.</div>
              <div className="bg-gray-50 rounded-xl px-5 py-3.5 text-left inline-block min-w-[280px]">
                <div className="flex justify-between mb-2">
                  <span className="text-[12px] text-gray-400">Equipamentos</span>
                  <span className="text-[12px] font-semibold text-gray-900">{selected.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[12px] text-gray-400">Tipo</span>
                  <span className="text-[12px] font-semibold text-gray-900 capitalize">{TICKET_TYPES.find((t) => t.id === type)?.label}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 justify-end px-6 py-4 border-t border-gray-200 flex-shrink-0">
          {step > 1 && step < 3 && (
            <button onClick={() => setStep((s) => s - 1)} className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
              Voltar
            </button>
          )}
          {step < 3 && (
            <button
              disabled={step === 1 && selected.length === 0}
              onClick={() => { if (step === 2) handleSubmit(); else if (selected.length > 0) setStep((s) => s + 1); }}
              className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white transition-opacity"
              style={{ background: "var(--brand-primary)", opacity: (step === 1 && selected.length === 0) ? 0.5 : 1, cursor: (step === 1 && selected.length === 0) ? "not-allowed" : "pointer" }}
            >
              {loading ? "Abrindo..." : step === 1 ? `Continuar${selected.length > 0 ? ` (${selected.length})` : ""}` : "Abrir Chamado"}
            </button>
          )}
          {step === 3 && <button onClick={handleClose} className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white" style={{ background: "var(--brand-primary)" }}>Fechar</button>}
        </div>
      </div>
    </div>
  );
}
