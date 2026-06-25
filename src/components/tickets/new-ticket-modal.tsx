"use client";

import { useState, useEffect, useRef } from "react";
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

interface User {
  id: string;
  name: string;
  role: string;
  avatar_url?: string | null;
}

const CAT_COLORS: Record<string, string> = {
  Pesagem: "#0363a9", Óptica: "#7c3aed", Química: "#059669",
  Esterilização: "#dc2626", Separação: "#d97706", Temperatura: "#ea580c", Microbiologia: "#0891b2",
};

interface Props {
  open: boolean;
  onClose: () => void;
  preselect?: string;
  userRole: string;
  saCompanyId?: string;
}

export function NewTicketModal({ open, onClose, preselect, userRole, saCompanyId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>(preselect ? [preselect] : []);
  const [type, setType] = useState("maintenance");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [isSupportRequest, setIsSupportRequest] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const isEmployee = userRole === "employee";
  const isAdmin = userRole === "admin";

  useEffect(() => {
    if (open && equipment.length === 0) {
      const qs = saCompanyId ? `company_id=${saCompanyId}&limit=50` : "limit=50";
      fetch(`/api/equipment?${qs}`).then((r) => r.json()).then((d) => setEquipment(d.data ?? [])).catch(() => {});
    }
  }, [open, saCompanyId]);

  useEffect(() => {
    if (preselect) setSelected([preselect]);
  }, [preselect]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      if (isEmployee) {
        const res = await fetch("/api/users?role=admin");
        const { data } = await res.json();
        setAssignableUsers(data ?? []);
        if ((data ?? []).length === 1) setAssignedTo(data[0].id);
      } else if (isAdmin) {
        const res = await fetch("/api/users");
        const { data } = await res.json();
        setAssignableUsers((data ?? []).filter((u: User) => u.role !== "super_admin"));
      }
    } catch { /* ignore */ }
    setLoadingUsers(false);
  };

  const reset = () => {
    setStep(1); setSelected(preselect ? [preselect] : []); setType("maintenance");
    setTitle(""); setDesc(""); setLoading(false); setAssignedTo(null);
    setIsSupportRequest(false); setPhotoFile(null); setPhotoPreview(null);
    setAssignableUsers([]);
  };

  const handleClose = () => { reset(); onClose(); };

  const toggleEq = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const selectedEq = equipment.find((e) => e.id === selected[0]);
      const body: Record<string, unknown> = {
        title: title || `${TICKET_TYPES.find((t) => t.id === type)?.label ?? "Chamado"} — ${selectedEq?.name ?? "Equipamento"}`,
        description: desc,
        equipment_id: selected[0] ?? null,
        type,
        priority: "medium",
        is_support_request: isSupportRequest,
      };

      if (!isSupportRequest && assignedTo) {
        body.assigned_to = assignedTo;
      }
      if (saCompanyId) {
        body.company_id = saCompanyId;
      }

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) { setLoading(false); return; }

      const { data: ticket } = await res.json();

      // Upload photo if selected
      if (photoFile && ticket?.id) {
        const fd = new FormData();
        fd.append("file", photoFile);
        const upRes = await fetch("/api/tickets/photo", { method: "POST", body: fd });
        if (upRes.ok) {
          const { url } = await upRes.json();
          await fetch(`/api/tickets/${ticket.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photo_url: url }),
          }).catch(() => {});
        }
      }

      setStep(3);
      router.refresh();
      setTimeout(handleClose, 1600);
    } catch { setLoading(false); }
  };

  if (!open) return null;

  const autoAssigned = isEmployee && assignableUsers.length === 1;

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
                      style={{ border: sel ? "2px solid #0363a9" : "1px solid #e5e7eb", boxShadow: sel ? "0 0 0 3px rgba(3,99,169,0.10)" : "none", fontFamily: "inherit" }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: sel ? "#0363a9" : color + "18" }}>
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
              {/* Selected equipment pills */}
              <div>
                <label className="text-[13px] font-semibold text-gray-700 block mb-2">Equipamentos selecionados</label>
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((id) => {
                    const eq = equipment.find((e) => e.id === id);
                    return eq ? <span key={id} className="px-2.5 py-1 rounded-full text-[12px] font-medium" style={{ background: "#e0f0fb", color: "#0363a9" }}>{eq.name}</span> : null;
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-[13px] font-semibold text-gray-700 block mb-2">Título</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Falha no sensor de temperatura"
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 outline-none focus:border-[#0363a9] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] transition-all"
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-[13px] font-semibold text-gray-700 block mb-2">Tipo de chamado</label>
                <div className="flex flex-wrap gap-2">
                  {TICKET_TYPES.map((t) => (
                    <button key={t.id} onClick={() => setType(t.id)}
                      className="h-[30px] px-3.5 rounded-full text-[12px] font-medium border-none cursor-pointer transition-all"
                      style={{ background: type === t.id ? "#0363a9" : "#f3f4f6", color: type === t.id ? "#fff" : "#374151", fontFamily: "inherit" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[13px] font-semibold text-gray-700 block mb-2">Descrição</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Descreva o problema ou solicitação com o máximo de detalhes..."
                  className="w-full h-24 rounded-[10px] border border-gray-300 px-3 py-2.5 text-[13px] text-gray-900 outline-none resize-none focus:border-[#0363a9] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] transition-all box-border"
                />
              </div>

              {/* Assignee section */}
              <div>
                <label className="text-[13px] font-semibold text-gray-700 block mb-2">Responsável</label>
                {loadingUsers ? (
                  <div className="text-[12px] text-gray-400">Carregando usuários...</div>
                ) : isEmployee ? (
                  autoAssigned ? (
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 bg-gray-50">
                      <div className="w-7 h-7 rounded-full bg-[#0363a9] flex items-center justify-center text-white text-[12px] font-bold">
                        {assignableUsers[0].name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-gray-900">{assignableUsers[0].name}</div>
                        <div className="text-[11px] text-gray-400">Administrador — atribuído automaticamente</div>
                      </div>
                    </div>
                  ) : assignableUsers.length > 1 ? (
                    <select
                      value={assignedTo ?? ""}
                      onChange={(e) => setAssignedTo(e.target.value || null)}
                      className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 outline-none focus:border-[#0363a9] bg-white"
                    >
                      <option value="">Selecionar administrador...</option>
                      {assignableUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-[12px] text-gray-400">Nenhum administrador disponível.</div>
                  )
                ) : isAdmin ? (
                  <div className="flex flex-col gap-2">
                    {/* Support request toggle */}
                    <button
                      type="button"
                      onClick={() => { setIsSupportRequest(!isSupportRequest); if (!isSupportRequest) setAssignedTo(null); }}
                      className="flex items-center gap-3 rounded-xl border p-3 transition-all text-left"
                      style={{ borderColor: isSupportRequest ? "#0363a9" : "#e5e7eb", background: isSupportRequest ? "#e0f0fb" : "#fff" }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isSupportRequest ? "#0363a9" : "#f3f4f6" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isSupportRequest ? "#fff" : "#6b7280"} strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.36 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.79a16 16 0 0 0 6.29 6.29l1.87-1.87a2 2 0 0 1 2.11-.45c.907.34 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: isSupportRequest ? "#0363a9" : "#111827" }}>Acionar Suporte (BSM)</div>
                        <div className="text-[11px]" style={{ color: isSupportRequest ? "#0363a9" : "#6b7280" }}>Encaminha o chamado para a equipe de suporte da BSM</div>
                      </div>
                    </button>

                    {!isSupportRequest && (
                      <select
                        value={assignedTo ?? ""}
                        onChange={(e) => setAssignedTo(e.target.value || null)}
                        className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 outline-none focus:border-[#0363a9] bg-white"
                      >
                        <option value="">Sem responsável definido</option>
                        {assignableUsers.map((u) => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role === "admin" ? "Admin" : "Funcionário"})</option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Photo upload */}
              <div>
                <label className="text-[13px] font-semibold text-gray-700 block mb-2">Foto (opcional)</label>
                {photoPreview ? (
                  <div className="flex items-center gap-3">
                    <img src={photoPreview} alt="preview" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                    <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="h-8 px-3 rounded-lg text-[12px] font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors">
                      Remover foto
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    className="flex items-center gap-2 h-10 px-4 rounded-lg border border-dashed border-gray-300 text-[12px] text-gray-500 hover:border-[#0363a9] hover:text-[#0363a9] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    Adicionar foto do problema
                  </button>
                )}
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }
                }} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div className="text-[18px] font-bold text-gray-900 mb-2">Chamado aberto com sucesso!</div>
              <div className="text-[14px] text-gray-500 mb-5">
                {isSupportRequest ? "O chamado foi encaminhado para o suporte BSM." : "O chamado foi registrado e será atribuído em breve."}
              </div>
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
              disabled={(step === 1 && selected.length === 0) || loading}
              onClick={() => {
                if (step === 1 && selected.length > 0) { loadUsers(); setStep(2); }
                else if (step === 2) handleSubmit();
              }}
              className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white transition-opacity"
              style={{
                background: "var(--brand-primary)",
                opacity: ((step === 1 && selected.length === 0) || loading) ? 0.5 : 1,
                cursor: ((step === 1 && selected.length === 0) || loading) ? "not-allowed" : "pointer",
              }}
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
