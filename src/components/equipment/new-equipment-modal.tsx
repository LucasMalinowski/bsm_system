"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["Pesagem", "Óptica", "Química", "Esterilização", "Separação", "Temperatura", "Microbiologia"];

interface Props {
  open: boolean;
  onClose: () => void;
  companyId?: string;
}

export function NewEquipmentModal({ open, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", internal_code: "", serial_number: "", brand: "", model: "",
    category: "Pesagem", location: "", acquisition_date: "", status: "active",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleClose = () => {
    setStep(1); setSaved(false); setLoading(false);
    setForm({ name: "", internal_code: "", serial_number: "", brand: "", model: "", category: "Pesagem", location: "", acquisition_date: "", status: "active" });
    onClose();
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          internal_code: form.internal_code,
          serial_number: form.serial_number || undefined,
          brand: form.brand || undefined,
          model: form.model || undefined,
          category_name: form.category,
          location: form.location || undefined,
          acquisition_date: form.acquisition_date || undefined,
          status: form.status,
        }),
      });
      setSaved(true);
      router.refresh();
      setTimeout(handleClose, 1400);
    } catch {
      setLoading(false);
    }
  };

  if (!open) return null;

  const inputCls = "w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 outline-none transition-all duration-150 focus:border-[#0363a9] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] bg-white box-border";
  const monoCls = inputCls + " font-mono";
  const lbl = (txt: string, req = false) => (
    <label className="text-[12px] font-semibold text-gray-700 block mb-1">
      {txt}{req && <span className="text-red-500"> *</span>}
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-[20px] overflow-hidden flex flex-col"
        style={{ width: 580, maxWidth: "calc(100vw - 32px)", maxHeight: "90vh", boxShadow: "0 25px 60px rgba(0,0,0,0.20)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 flex-shrink-0">
          <span className="text-[16px] font-bold text-gray-900">Novo Equipamento</span>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Stepper */}
          <div className="flex items-center mb-6">
            {[1, 2].map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] font-bold transition-all"
                    style={{ background: step >= s ? "#0363a9" : "#f3f4f6", color: step >= s ? "#fff" : "#9ca3af" }}
                  >
                    {step > s ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    ) : s}
                  </div>
                  <span className="text-[11px]" style={{ color: step >= s ? "#0363a9" : "#9ca3af", fontWeight: step === s ? 600 : 400 }}>
                    {["Identificação", "Classificação"][i]}
                  </span>
                </div>
                {i < 1 && (
                  <div className="flex-1 h-0.5 mx-2.5 mb-4 transition-all" style={{ background: step > 1 ? "#0363a9" : "#e5e7eb" }} />
                )}
              </div>
            ))}
          </div>

          {saved ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div className="text-[18px] font-bold text-gray-900 mb-1.5">Equipamento cadastrado!</div>
              <div className="text-[13px] text-gray-500">O equipamento foi adicionado com sucesso.</div>
            </div>
          ) : step === 1 ? (
            <div className="flex flex-col gap-3.5">
              <div>
                {lbl("Nome do equipamento", true)}
                <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Balança Analítica" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  {lbl("Código interno", true)}
                  <input value={form.internal_code} onChange={(e) => set("internal_code", e.target.value)} placeholder="EQ-2025-001" className={monoCls} />
                </div>
                <div>
                  {lbl("Número de série")}
                  <input value={form.serial_number} onChange={(e) => set("serial_number", e.target.value)} placeholder="SHZ-2025-00001" className={monoCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  {lbl("Fabricante")}
                  <input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Ex: Shimadzu" className={inputCls} />
                </div>
                <div>
                  {lbl("Modelo")}
                  <input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Ex: AUW220" className={inputCls} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              <div>
                {lbl("Categoria")}
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => set("category", c)}
                      className="h-[30px] px-3.5 rounded-full text-[12px] font-medium border-none cursor-pointer transition-all duration-150"
                      style={{ background: form.category === c ? "#0363a9" : "#f3f4f6", color: form.category === c ? "#fff" : "#374151", fontFamily: "inherit" }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                {lbl("Localização")}
                <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Ex: Lab A — Sala 2" className={inputCls} />
              </div>
              <div>
                {lbl("Data de aquisição")}
                <input value={form.acquisition_date} onChange={(e) => set("acquisition_date", e.target.value)} type="date" className={inputCls} />
              </div>
              <div>
                {lbl("Status inicial")}
                <div className="flex gap-2">
                  {[["active", "Ativo"], ["inactive", "Inativo"]].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => set("status", id)}
                      className="flex-1 h-10 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all duration-150"
                      style={{
                        border: form.status === id ? "2px solid #0363a9" : "1px solid #e5e7eb",
                        background: form.status === id ? "#e0f0fb" : "#fff",
                        color: form.status === id ? "#0363a9" : "#374151",
                        fontFamily: "inherit",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!saved && (
          <div className="flex gap-2.5 justify-end px-6 py-4 border-t border-gray-200 flex-shrink-0">
            {step > 1 && (
              <button onClick={() => setStep(1)} className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                Voltar
              </button>
            )}
            <button
              disabled={(step === 1 && (!form.name || !form.internal_code)) || loading}
              onClick={() => { if (step === 1) { if (form.name && form.internal_code) setStep(2); } else handleSave(); }}
              className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white transition-opacity"
              style={{ background: "var(--brand-primary)", opacity: ((step === 1 && (!form.name || !form.internal_code)) || loading) ? 0.5 : 1, cursor: ((step === 1 && (!form.name || !form.internal_code)) || loading) ? "not-allowed" : "pointer" }}
            >
              {loading ? "Salvando..." : step === 1 ? "Continuar" : "Salvar Equipamento"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
