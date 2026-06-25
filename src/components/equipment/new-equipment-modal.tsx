"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["Pesagem", "Óptica", "Química", "Esterilização", "Separação", "Temperatura", "Microbiologia"];
const PERIODICITIES = [
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
  { value: "bi_anual", label: "Bi-Anual" },
  { value: "tri_anual", label: "Tri-Anual" },
  { value: "outro", label: "Outro" },
];

type CalibrationPoint = { point_value: string; criterion: string; error_tolerance: string };

interface DocPreview { id: string; name: string }

interface Props {
  open: boolean;
  onClose: () => void;
  companyId?: string;
}

export function NewEquipmentModal({ open, onClose, companyId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [docsToCopy, setDocsToCopy] = useState<DocPreview[]>([]);
  const [checkingDocs, setCheckingDocs] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", internal_code: "", serial_number: "", brand: "", model: "", tag: "", scale: "",
    category: "Pesagem", location: "", acquisition_date: "", status: "active",
    requires_calibration: true,
    calibration_periodicity: "anual",
  });
  const [calPoints, setCalPoints] = useState<CalibrationPoint[]>([]);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleClose = () => {
    setStep(1); setSaved(false); setLoading(false); setDocsToCopy([]); setPhotoFile(null); setPhotoPreview(null);
    setCalPoints([]);
    setForm({ name: "", internal_code: "", serial_number: "", brand: "", model: "", tag: "", scale: "", category: "Pesagem", location: "", acquisition_date: "", status: "active", requires_calibration: true, calibration_periodicity: "anual" });
    onClose();
  };

  const addPoint = () => setCalPoints((p) => [...p, { point_value: "", criterion: "", error_tolerance: "" }]);
  const removePoint = (idx: number) => setCalPoints((p) => p.filter((_, i) => i !== idx));
  const updatePoint = (idx: number, field: keyof CalibrationPoint, value: string) =>
    setCalPoints((p) => p.map((pt, i) => i === idx ? { ...pt, [field]: value } : pt));

  const goToConfirm = async () => {
    setCheckingDocs(true);
    if (form.model) {
      try {
        const qs = companyId
          ? `model=${encodeURIComponent(form.model)}&company_id=${companyId}`
          : `model=${encodeURIComponent(form.model)}`;
        const res = await fetch(`/api/equipment/docs-by-model?${qs}`);
        if (res.ok) {
          const { data } = await res.json();
          setDocsToCopy((data ?? []) as DocPreview[]);
        }
      } catch { /* ignore */ }
    } else {
      setDocsToCopy([]);
    }
    setCheckingDocs(false);
    setStep(3);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Upload photo first if selected
      let imageUrl: string | undefined;
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        const upRes = await fetch("/api/equipment/photo", { method: "POST", body: fd });
        if (upRes.ok) {
          const { url } = await upRes.json();
          imageUrl = url;
        }
      }

      const body: Record<string, unknown> = {
        name: form.name,
        internal_code: form.internal_code,
        serial_number: form.serial_number || undefined,
        brand: form.brand || undefined,
        model: form.model || undefined,
        tag: form.tag || undefined,
        scale: form.scale || undefined,
        category_name: form.category,
        location: form.location || undefined,
        acquisition_date: form.acquisition_date || undefined,
        status: form.status,
        requires_calibration: form.requires_calibration,
        calibration_periodicity: form.requires_calibration ? form.calibration_periodicity || null : null,
      };
      if (imageUrl) body.image_url = imageUrl;
      if (companyId) body.company_id = companyId;

      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setLoading(false);
        return;
      }

      const { data: equipment } = await res.json();

      // Save calibration points
      if (form.requires_calibration && calPoints.filter((p) => p.point_value.trim()).length > 0) {
        await fetch(`/api/equipment/${equipment.id}/calibration-points`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            points: calPoints
              .filter((p) => p.point_value.trim())
              .map((p, i) => ({
                ...p,
                error_tolerance: p.error_tolerance.trim() ? Number(p.error_tolerance) : null,
                sort_order: i,
              })),
          }),
        }).catch(() => {});
      }

      // Copy docs from same model
      if (docsToCopy.length > 0) {
        const copyBody: Record<string, unknown> = { model: form.model };
        if (companyId) copyBody.company_id = companyId;
        await fetch(`/api/equipment/${equipment.id}/copy-docs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(copyBody),
        }).catch(() => {});
      }

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

  const STEP_LABELS = ["Identificação", "Calibração", "Confirmação"];

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
          <span className="text-[16px] font-bold text-gray-900">Novo Equipamento</span>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Stepper */}
          <div className="flex items-center mb-6">
            {[1, 2, 3].map((s, i) => (
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
                    {STEP_LABELS[i]}
                  </span>
                </div>
                {i < 2 && (
                  <div className="flex-1 h-0.5 mx-2.5 mb-4 transition-all" style={{ background: step > s ? "#0363a9" : "#e5e7eb" }} />
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
            /* ─── Step 1: Identification ─── */
            <div className="flex flex-col gap-3.5">
              {/* Photo */}
              <div>
                {lbl("Foto do equipamento")}
                <div className="flex items-center gap-3">
                  {photoPreview ? (
                    <img src={photoPreview} alt="preview" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => photoRef.current?.click()}
                      className="h-8 px-3 rounded-lg text-[12px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                    >
                      {photoFile ? "Trocar foto" : "Selecionar foto"}
                    </button>
                    {photoFile && (
                      <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="text-[11px] text-red-500 hover:text-red-600">Remover</button>
                    )}
                    <p className="text-[11px] text-gray-400">JPG, PNG, WebP até 5 MB</p>
                  </div>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }
                  }} />
                </div>
              </div>

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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  {lbl("Tag")}
                  <input value={form.tag} onChange={(e) => set("tag", e.target.value)} placeholder="Ex: TAG-001" className={monoCls} />
                </div>
                <div>
                  {lbl("Escala")}
                  <input value={form.scale} onChange={(e) => set("scale", e.target.value)} placeholder="Ex: 0-220g" className={inputCls} />
                </div>
              </div>
              <div>
                {lbl("Categoria")}
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button key={c} type="button" onClick={() => set("category", c)}
                      className="h-[30px] px-3.5 rounded-full text-[12px] font-medium border-none cursor-pointer transition-all duration-150"
                      style={{ background: form.category === c ? "#0363a9" : "#f3f4f6", color: form.category === c ? "#fff" : "#374151", fontFamily: "inherit" }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                {lbl("Localização")}
                <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Ex: Lab A — Sala 2" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  {lbl("Data de aquisição")}
                  <input value={form.acquisition_date} onChange={(e) => set("acquisition_date", e.target.value)} type="date" className={inputCls} />
                </div>
                <div>
                  {lbl("Status inicial")}
                  <div className="flex gap-2">
                    {[["active", "Ativo"], ["inactive", "Inativo"]].map(([id, label]) => (
                      <button key={id} type="button" onClick={() => set("status", id)}
                        className="flex-1 h-10 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all duration-150"
                        style={{ border: form.status === id ? "2px solid #0363a9" : "1px solid #e5e7eb", background: form.status === id ? "#e0f0fb" : "#fff", color: form.status === id ? "#0363a9" : "#374151", fontFamily: "inherit" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          ) : step === 2 ? (
            /* ─── Step 2: Calibration ─── */
            <div className="flex flex-col gap-4">
              {/* Requires calibration toggle */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div>
                  <div className="text-[13px] font-semibold text-gray-900">Exige calibração?</div>
                  <div className="text-[12px] text-gray-500 mt-0.5">Define se este equipamento tem periodicidade de calibração</div>
                </div>
                <button
                  type="button"
                  onClick={() => set("requires_calibration", !form.requires_calibration)}
                  className="flex-shrink-0 relative cursor-pointer transition-all"
                  style={{ width: 44, height: 24, borderRadius: 12, background: form.requires_calibration ? "#0363a9" : "#d1d5db", border: "none", padding: 0 }}
                >
                  <div className="absolute top-[2px] w-5 h-5 rounded-full bg-white transition-all duration-200"
                    style={{ left: form.requires_calibration ? 22 : 2, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </button>
              </div>

              {form.requires_calibration && (
                <>
                  {/* Periodicity */}
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 block mb-1.5">Periodicidade</label>
                    <div className="flex flex-wrap gap-1.5">
                      {PERIODICITIES.map((p) => (
                        <button key={p.value} type="button" onClick={() => set("calibration_periodicity", p.value)}
                          className="h-[30px] px-3.5 rounded-full text-[12px] font-medium border-none cursor-pointer transition-all"
                          style={{ background: form.calibration_periodicity === p.value ? "#0363a9" : "#f3f4f6", color: form.calibration_periodicity === p.value ? "#fff" : "#374151", fontFamily: "inherit" }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calibration points */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[12px] font-semibold text-gray-700">Pontos de calibração</label>
                      <button type="button" onClick={addPoint}
                        className="h-7 px-3 rounded-lg text-[11px] font-medium text-[#0363a9] border border-[#0363a9] bg-white hover:bg-blue-50 transition-colors">
                        + Adicionar ponto
                      </button>
                    </div>
                    {calPoints.length === 0 ? (
                      <p className="text-[12px] text-gray-400 text-center py-3 rounded-xl border border-dashed border-gray-200">
                        Nenhum ponto adicionado. Você pode adicionar depois no detalhe do equipamento.
                      </p>
                    ) : (
                      <div className="rounded-xl border border-gray-200 overflow-hidden text-[12px]">
                        <div className="grid grid-cols-[1fr_80px_1fr_32px] bg-gray-50 border-b border-gray-200 px-3 py-2">
                          <span className="font-semibold text-gray-500">Ponto</span>
                          <span className="font-semibold text-gray-500 text-center">Erro (tol.)</span>
                          <span className="font-semibold text-gray-500">Critério</span>
                          <span />
                        </div>
                        {calPoints.map((p, idx) => (
                          <div key={idx} className="grid grid-cols-[1fr_80px_1fr_32px] px-3 py-1.5 border-b border-gray-100 last:border-none items-center gap-2">
                            <input value={p.point_value} onChange={(e) => updatePoint(idx, "point_value", e.target.value)} placeholder="Ex: 100g" className="h-7 rounded-md border border-gray-200 px-2 text-[12px] outline-none focus:border-[#0363a9]" />
                            <input value={p.error_tolerance} onChange={(e) => updatePoint(idx, "error_tolerance", e.target.value)} placeholder="±0.1" className="h-7 rounded-md border border-gray-200 px-2 text-[12px] outline-none focus:border-[#0363a9] text-center" />
                            <input value={p.criterion} onChange={(e) => updatePoint(idx, "criterion", e.target.value)} placeholder="Critério de aceite" className="h-7 rounded-md border border-gray-200 px-2 text-[12px] outline-none focus:border-[#0363a9]" />
                            <button type="button" onClick={() => removePoint(idx)} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

          ) : (
            /* ─── Step 3: Confirmation ─── */
            <div className="flex flex-col gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Resumo do equipamento</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                  <span className="text-gray-500">Nome</span><span className="text-gray-900 font-medium">{form.name}</span>
                  <span className="text-gray-500">Código</span><span className="text-gray-900 font-medium font-mono">{form.internal_code}</span>
                  {form.serial_number && <><span className="text-gray-500">Nº Série</span><span className="text-gray-900 font-medium font-mono">{form.serial_number}</span></>}
                  {form.brand && <><span className="text-gray-500">Fabricante</span><span className="text-gray-900 font-medium">{form.brand}</span></>}
                  {form.model && <><span className="text-gray-500">Modelo</span><span className="text-gray-900 font-medium">{form.model}</span></>}
                  {form.tag && <><span className="text-gray-500">Tag</span><span className="text-gray-900 font-medium font-mono">{form.tag}</span></>}
                  {form.scale && <><span className="text-gray-500">Escala</span><span className="text-gray-900 font-medium">{form.scale}</span></>}
                  <span className="text-gray-500">Categoria</span><span className="text-gray-900 font-medium">{form.category}</span>
                  {form.location && <><span className="text-gray-500">Localização</span><span className="text-gray-900 font-medium">{form.location}</span></>}
                  {form.acquisition_date && <><span className="text-gray-500">Aquisição</span><span className="text-gray-900 font-medium">{form.acquisition_date}</span></>}
                  <span className="text-gray-500">Status</span><span className="text-gray-900 font-medium capitalize">{form.status === "active" ? "Ativo" : "Inativo"}</span>
                  <span className="text-gray-500">Calibração</span>
                  <span className="text-gray-900 font-medium">
                    {form.requires_calibration ? `Sim — ${PERIODICITIES.find((p) => p.value === form.calibration_periodicity)?.label ?? ""}` : "Não exige"}
                  </span>
                  {form.requires_calibration && calPoints.filter((p) => p.point_value).length > 0 && (
                    <><span className="text-gray-500">Pontos</span><span className="text-gray-900 font-medium">{calPoints.filter((p) => p.point_value).length} ponto(s)</span></>
                  )}
                </div>
                {photoFile && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                    <img src={photoPreview!} alt="preview" className="w-12 h-12 rounded-lg object-cover" />
                    <span className="text-[12px] text-gray-600">{photoFile.name}</span>
                  </div>
                )}
              </div>

              {checkingDocs ? (
                <div className="text-[12px] text-gray-400 text-center py-2">Verificando documentos existentes...</div>
              ) : docsToCopy.length > 0 ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="text-[12px] font-semibold text-blue-800 mb-2">
                    {docsToCopy.length} documento(s) serão copiados automaticamente
                  </div>
                  <div className="text-[11px] text-blue-600 mb-2">De equipamentos com o mesmo modelo ({form.model}):</div>
                  <ul className="flex flex-col gap-1">
                    {docsToCopy.map((d) => (
                      <li key={d.id} className="text-[12px] text-blue-700 flex items-center gap-1.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                        {d.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : form.model ? (
                <div className="text-[12px] text-gray-400 text-center py-1">Nenhum documento encontrado para o modelo "{form.model}".</div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        {!saved && (
          <div className="flex gap-2.5 justify-end px-6 py-4 border-t border-gray-200 flex-shrink-0">
            {step > 1 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                Voltar
              </button>
            )}
            <button
              type="button"
              disabled={(step === 1 && (!form.name || !form.internal_code)) || loading || checkingDocs}
              onClick={() => {
                if (step === 1) { if (form.name && form.internal_code) setStep(2); }
                else if (step === 2) { goToConfirm(); }
                else handleSave();
              }}
              className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white transition-opacity"
              style={{
                background: "var(--brand-primary)",
                opacity: ((step === 1 && (!form.name || !form.internal_code)) || loading || checkingDocs) ? 0.5 : 1,
                cursor: ((step === 1 && (!form.name || !form.internal_code)) || loading || checkingDocs) ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Salvando..." : checkingDocs ? "Verificando..." : step < 3 ? "Continuar" : "Confirmar e Criar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
