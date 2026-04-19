"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CAT_COLORS: Record<string, string> = {
  Pesagem: "#0363a9", Óptica: "#7c3aed", Química: "#059669",
  Esterilização: "#dc2626", Separação: "#d97706", Temperatura: "#ea580c", Microbiologia: "#0891b2",
};
const STATUS_MAP: Record<string, { bg: string; text: string; label: string; variant: string }> = {
  active:            { bg: "#dcfce7", text: "#166534", label: "Ativo",         variant: "success" },
  inactive:          { bg: "#f3f4f6", text: "#374151", label: "Inativo",       variant: "neutral" },
  under_maintenance: { bg: "#fef9c3", text: "#854d0e", label: "Manutenção",    variant: "warning" },
  calibration:       { bg: "#dbeafe", text: "#1e40af", label: "Calibração",    variant: "info" },
  retired:           { bg: "#fee2e2", text: "#b91c1c", label: "Descartado",    variant: "error" },
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

type Tab = "dados" | "calibração" | "manutenção" | "docs";

interface Props {
  equipment: Equipment | null;
  open: boolean;
  onClose: () => void;
  onOpenTicket?: (eq: Equipment) => void;
}

export function EquipmentSlidePanel({ equipment: eq, open, onClose, onOpenTicket }: Props) {
  const [tab, setTab] = useState<Tab>("dados");

  useEffect(() => {
    if (open) setTab("dados");
  }, [open, eq?.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const color = eq?.category?.name ? (CAT_COLORS[eq.category.name] ?? "#0363a9") : "#0363a9";
  const st = eq ? (STATUS_MAP[eq.status] ?? STATUS_MAP.inactive) : STATUS_MAP.inactive;

  const tabs: Tab[] = ["dados", "calibração", "manutenção", "docs"];

  const maintHistory = eq?.history?.filter((h) => h.action === "maintenance_added") ?? [];
  const calHistory   = eq?.history?.filter((h) => h.action === "calibration_added") ?? [];
  const docHistory   = eq?.history?.filter((h) => h.action === "document_attached") ?? [];

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/25 z-[200]"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-[300] flex flex-col bg-white border-l border-gray-200 overflow-hidden"
        style={{
          width: 480,
          maxWidth: "100vw",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.10)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Category color strip */}
        <div style={{ height: 6, background: `linear-gradient(90deg, ${color}, ${color}99)`, flexShrink: 0 }} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 flex-shrink-0">
          <div>
            <div className="text-[17px] font-bold text-gray-900">{eq?.name ?? "—"}</div>
            <div className="text-[12px] text-gray-400 mt-0.5 font-mono">{eq?.internal_code}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0 ml-3"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" style={{ background: st.bg, color: st.text }}>
            {st.label}
          </span>
          {eq?.location && (
            <span className="flex items-center gap-1 text-[12px] text-gray-400">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              {eq.location}
            </span>
          )}
          {eq?.next_calibration && (
            <span className="flex items-center gap-1 text-[12px] text-gray-400">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              Próx. cal: {eq.next_calibration}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-2 flex-shrink-0">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 h-10 border-none bg-none cursor-pointer text-[12px] capitalize transition-all duration-150"
              style={{
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? "#0363a9" : "#6b7280",
                borderBottom: tab === t ? "2px solid #0363a9" : "2px solid transparent",
                fontFamily: "inherit",
                background: "none",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "dados" && (
            <div className="grid grid-cols-2 gap-2.5">
              {[
                ["Fabricante", eq?.brand ?? "—"],
                ["Modelo", eq?.model ?? "—"],
                ["Categoria", eq?.category?.name ?? "—"],
                ["Localização", eq?.location ?? "—"],
                ["Data Aquisição", eq?.acquisition_date ?? "—"],
                ["Nº de Série", eq?.serial_number ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-[10px] p-3">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
                  <div
                    className="text-[13px] font-semibold text-gray-900"
                    style={{ fontFamily: label === "Nº de Série" ? "var(--font-mono), monospace" : "inherit" }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "calibração" && (
            <div className="flex flex-col gap-3">
              {calHistory.length === 0 ? (
                <div className="text-center py-8 text-[13px] text-gray-400">Nenhum ponto de calibração registrado</div>
              ) : calHistory.map((h, i) => (
                <div key={i} className="bg-gray-50 rounded-[10px] p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-[12px] text-gray-400">{new Date(h.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div className="text-[13px] font-semibold text-gray-900">{h.description}</div>
                  {h.user && <div className="text-[12px] text-gray-500 mt-1">{h.user.name}</div>}
                </div>
              ))}
              <Link
                href={`/equipment/${eq?.id}`}
                className="flex items-center gap-1.5 h-9 w-fit px-3 rounded-lg text-[13px] font-semibold text-white"
                style={{ background: "var(--brand-primary)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Registrar Calibração
              </Link>
            </div>
          )}

          {tab === "manutenção" && (
            <div className="flex flex-col gap-2.5">
              {maintHistory.length === 0 ? (
                <div className="text-center py-8 text-[13px] text-gray-400">Nenhuma manutenção registrada</div>
              ) : maintHistory.map((h, i) => (
                <div key={i} className="bg-gray-50 rounded-[10px] p-3">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] text-gray-400 flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                      {new Date(h.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="text-[13px] font-semibold text-gray-900 mb-0.5">{h.description}</div>
                  {h.user && <div className="text-[12px] text-gray-500">{h.user.name}</div>}
                </div>
              ))}
              <Link
                href={`/equipment/${eq?.id}`}
                className="flex items-center gap-1.5 h-9 w-fit px-3 rounded-lg text-[13px] font-semibold text-white"
                style={{ background: "var(--brand-primary)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Registrar Manutenção
              </Link>
            </div>
          )}

          {tab === "docs" && (
            <div className="flex flex-col gap-2">
              {docHistory.length === 0 ? (
                <div className="text-center py-8 text-[13px] text-gray-400">Nenhum documento anexado</div>
              ) : docHistory.map((h, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-gray-50 rounded-[10px] p-3">
                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-gray-900 truncate">{h.description}</div>
                    <div className="text-[11px] text-gray-400">{new Date(h.created_at).toLocaleDateString("pt-BR")}</div>
                  </div>
                </div>
              ))}
              <Link
                href={`/equipment/${eq?.id}`}
                className="flex items-center gap-1.5 h-9 w-fit px-3 rounded-lg text-[13px] font-semibold text-white"
                style={{ background: "var(--brand-primary)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Anexar Documento
              </Link>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2.5 px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
          <button
            onClick={() => eq && onOpenTicket?.(eq)}
            className="flex-1 h-10 rounded-[10px] text-[13px] font-semibold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
            style={{ background: "var(--brand-primary)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"/></svg>
            Abrir Chamado
          </button>
          <Link
            href={eq ? `/api/equipment/${eq.id}/qrcode` : "#"}
            target="_blank"
            className="h-10 px-4 rounded-[10px] text-[13px] font-semibold text-gray-700 border border-gray-200 flex items-center gap-1.5 hover:bg-gray-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/>
              <path d="M21 16h-3v3M21 21h-1M16 16h1v1"/>
            </svg>
            QR Code
          </Link>
        </div>
      </div>
    </>
  );
}
