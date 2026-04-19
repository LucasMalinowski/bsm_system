"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Equipment, EquipmentHistory } from "@/types";

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
  formatDate: (d: string | null | undefined) => string;
}

export function EquipmentDetailClient({ equipment, canCreate, formatDate }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dados");

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
            {[
              ["Fabricante", equipment.brand],
              ["Modelo", equipment.model],
              ["Número de Série", equipment.serial_number],
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
          <>
            {calHistory.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-[13px]">Sem registros de calibração</div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="px-3.5 py-2.5 border-b border-gray-200 grid gap-2"
                  style={{ gridTemplateColumns: "1fr 1fr 1fr", background: "#f9fafb" }}
                >
                  {["Data", "Ação", "Técnico"].map((h) => (
                    <span key={h} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</span>
                  ))}
                </div>
                {calHistory.map((h, i) => (
                  <div
                    key={h.id}
                    className="px-3.5 py-3 grid gap-2 items-center"
                    style={{
                      gridTemplateColumns: "1fr 1fr 1fr",
                      borderBottom: i < calHistory.length - 1 ? "1px solid #f3f4f6" : "none",
                    }}
                  >
                    <span className="text-[12px] font-mono text-gray-700">{formatDate(h.created_at)}</span>
                    <span className="text-[12px] text-gray-500 truncate">{h.description}</span>
                    <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-[2px] rounded-full inline-block">
                      {h.user?.name ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
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
          <Link
            href={`/tickets/new?equipment=${equipment.id}`}
            className="flex-1 h-[46px] rounded-xl flex items-center justify-center gap-1.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#0363a9" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"/>
            </svg>
            Abrir Chamado
          </Link>
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
    </div>
  );
}
