"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeEditor } from "./theme-editor";
import { LogoUpload } from "./logo-upload";

const BRAND_COLORS = ["#0363a9", "#7c3aed", "#059669", "#dc2626", "#d97706", "#0891b2"];

const NOTIFICATIONS = [
  { id: "cal_alert",   title: "Alerta de calibração próxima",  desc: "30 dias antes do vencimento",       defaultOn: true },
  { id: "unassigned",  title: "Chamado sem responsável",        desc: "Após 24h sem atribuição",            defaultOn: true },
  { id: "weekly",      title: "Relatório semanal",              desc: "Toda segunda-feira às 8h",           defaultOn: false },
];

interface Props {
  companyId: string;
  companyName: string;
  cnpj: string;
  currentTheme: {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    logo_url: string | null;
  };
}

export function SettingsClient({ companyId, companyName, cnpj, currentTheme }: Props) {
  const router = useRouter();
  const [name, setName] = useState(companyName);
  const [cnpjVal, setCnpj] = useState(cnpj);
  const [primaryColor, setPrimaryColor] = useState(currentTheme.primary_color);
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATIONS.map((n) => [n.id, n.defaultOn]))
  );
  const [saving, setSaving] = useState(false);

  const toggleNotif = (id: string) =>
    setNotifications((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, primary_color: primaryColor }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-7 flex flex-col gap-5 max-w-[680px]">
      <div>
        <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Configurações</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Personalize o ambiente da sua empresa</p>
      </div>

      {/* Company identity */}
      <div className="bg-white border border-gray-200 rounded-xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <h2 className="text-[15px] font-bold text-gray-900 mb-5">Identidade da Empresa</h2>
        <div className="flex flex-col gap-4">
          {/* Logo */}
          <LogoUpload companyId={companyId} currentLogoUrl={currentTheme.logo_url} />

          {/* Name */}
          <div>
            <label className="text-[13px] font-medium text-gray-700 block mb-1.5">Nome da empresa</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 outline-none focus:border-[#0363a9] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] transition-all"
            />
          </div>

          {/* CNPJ */}
          <div>
            <label className="text-[13px] font-medium text-gray-700 block mb-1.5">CNPJ</label>
            <input
              value={cnpjVal}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0001-00"
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 outline-none focus:border-[#0363a9] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] transition-all font-mono"
            />
          </div>

          {/* Primary color swatches */}
          <div>
            <label className="text-[13px] font-medium text-gray-700 block mb-2">Cor primária</label>
            <div className="flex items-center gap-2">
              {BRAND_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPrimaryColor(c)}
                  className="w-8 h-8 rounded-lg border-none cursor-pointer transition-all"
                  style={{
                    background: c,
                    outline: primaryColor === c ? "3px solid #111827" : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
              <span className="text-[12px] text-gray-400 ml-1 font-mono">{primaryColor}</span>
            </div>
          </div>

          {/* Theme editor (secondary/accent colors) */}
          <ThemeEditor companyId={companyId} currentTheme={currentTheme} />
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white border border-gray-200 rounded-xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <h2 className="text-[15px] font-bold text-gray-900 mb-5">Notificações</h2>
        <div className="flex flex-col">
          {NOTIFICATIONS.map((n, i) => (
            <div
              key={n.id}
              className="flex justify-between items-center"
              style={{ padding: i > 0 ? "12px 0" : "0 0 12px", borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}
            >
              <div>
                <div className="text-[13px] font-semibold text-gray-900">{n.title}</div>
                <div className="text-[12px] text-gray-400">{n.desc}</div>
              </div>
              {/* Toggle switch */}
              <button
                onClick={() => toggleNotif(n.id)}
                className="flex-shrink-0 relative cursor-pointer transition-all"
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: notifications[n.id] ? "var(--brand-primary)" : "#d1d5db",
                  border: "none",
                  padding: 0,
                }}
              >
                <div
                  className="absolute top-[2px] w-5 h-5 rounded-full bg-white transition-all duration-200"
                  style={{
                    left: notifications[n.id] ? 22 : 2,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex gap-2.5 justify-end">
        <button
          onClick={() => router.refresh()}
          className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white transition-opacity"
          style={{ background: "var(--brand-primary)", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
