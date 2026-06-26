"use client";

import { useState, useCallback, useEffect } from "react";

type Tab = "gastos" | "manutencao" | "calibracao" | "chamados";

interface ReportData {
  spending: {
    totals: { equipment: number; calibration: number; maintenance: number };
    by_equipment: { id: string; name: string; acquisition_cost: number; calibration_cost: number; maintenance_cost: number }[];
  };
  maintenance: {
    by_equipment: { id: string; name: string; total: number; last_maintenance: string | null; avg_interval_days: number | null }[];
  };
  calibration: {
    totals: { total_scheduled: number; overdue: number; upcoming: number; ok: number };
    by_equipment: { id: string; name: string; periodicity_days: number | null; next_calibration: string | null; status: "overdue" | "upcoming" | "ok" | "no_schedule" }[];
  };
  tickets: {
    totals: { total: number; avg_resolution_days: number | null; avg_open_days: number | null };
    by_type: Record<string, number>;
    by_priority: Record<string, number>;
  };
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  overdue:     { label: "Atrasada",   color: "#dc2626", bg: "#fee2e2" },
  upcoming:    { label: "Próxima",    color: "#d97706", bg: "#fef3c7" },
  ok:          { label: "Ok",         color: "#059669", bg: "#d1fae5" },
  no_schedule: { label: "Sem agenda", color: "#9ca3af", bg: "#f3f4f6" },
};

const TICKET_TYPE_LABEL: Record<string, string> = {
  maintenance: "Manutenção", calibration: "Calibração", repair: "Reparo",
  inspection: "Inspeção", installation: "Instalação", other: "Outro",
};

const PRIORITY_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  low:      { label: "Baixa",   color: "#059669", bg: "#d1fae5" },
  medium:   { label: "Média",   color: "#d97706", bg: "#fef3c7" },
  high:     { label: "Alta",    color: "#dc2626", bg: "#fee2e2" },
  critical: { label: "Crítica", color: "#7c3aed", bg: "#ede9fe" },
};

interface Props {
  isSuperAdmin: boolean;
  companyId?: string;
  companies?: { id: string; name: string }[];
}

export function ReportsClient({ isSuperAdmin, companyId: initialCompanyId, companies }: Props) {
  const [tab, setTab] = useState<Tab>("gastos");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId ?? "");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (isSuperAdmin && selectedCompanyId) params.set("company_id", selectedCompanyId);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar relatório");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [from, to, selectedCompanyId, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "gastos",      label: "Gastos" },
    { key: "manutencao",  label: "Manutenção" },
    { key: "calibracao",  label: "Calibração" },
    { key: "chamados",    label: "Chamados" },
  ];

  return (
    <div className="p-4 lg:p-7 flex flex-col gap-5 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Relatórios</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Análise de gastos, manutenções, calibrações e chamados</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        {isSuperAdmin && companies && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Empresa</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 px-3 text-[13px] text-gray-700 outline-none focus:border-[var(--brand-primary)] min-w-[180px]"
            >
              <option value="">Todas as empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">De</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border border-gray-200 px-3 text-[13px] text-gray-700 outline-none focus:border-[var(--brand-primary)]" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Até</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border border-gray-200 px-3 text-[13px] text-gray-700 outline-none focus:border-[var(--brand-primary)]" />
        </div>
        <button onClick={load} disabled={loading} className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "var(--brand-primary)" }}>
          {loading ? "Carregando..." : "Atualizar"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-[13px] text-red-600">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-16 text-gray-400 text-[13px]">Carregando...</div>
      )}

      {data && (
        <>
          {/* ── GASTOS ───────────────────────────────────────────────────── */}
          {tab === "gastos" && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Aquisição de Equipamentos", value: data.spending.totals.equipment, color: "#0363a9", bg: "#e0f0fb" },
                  { label: "Calibrações", value: data.spending.totals.calibration, color: "#059669", bg: "#d1fae5" },
                  { label: "Manutenções", value: data.spending.totals.maintenance, color: "#d97706", bg: "#fef3c7" },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: card.color }}>{card.label}</div>
                    <div className="text-[24px] font-extrabold text-gray-900">R$ {fmt(card.value)}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Equipamento", "Aquisição", "Calibrações", "Manutenções", "Total"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.spending.by_equipment.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Nenhum dado</td></tr>
                    ) : data.spending.by_equipment.map((row) => {
                      const total = row.acquisition_cost + row.calibration_cost + row.maintenance_cost;
                      return (
                        <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                          <td className="px-4 py-3 text-gray-600">R$ {fmt(row.acquisition_cost)}</td>
                          <td className="px-4 py-3 text-gray-600">R$ {fmt(row.calibration_cost)}</td>
                          <td className="px-4 py-3 text-gray-600">R$ {fmt(row.maintenance_cost)}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">R$ {fmt(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── MANUTENÇÃO ───────────────────────────────────────────────── */}
          {tab === "manutencao" && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Equipamento", "Total Manutenções", "Última Manutenção", "Intervalo Médio"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.maintenance.by_equipment.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Nenhum dado</td></tr>
                  ) : data.maintenance.by_equipment.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                      <td className="px-4 py-3 text-gray-700">{row.total}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtDate(row.last_maintenance)}</td>
                      <td className="px-4 py-3 text-gray-600">{row.avg_interval_days != null ? `${row.avg_interval_days} dias` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── CALIBRAÇÃO ───────────────────────────────────────────────── */}
          {tab === "calibracao" && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Com agenda", value: data.calibration.totals.total_scheduled, color: "#0363a9", bg: "#e0f0fb" },
                  { label: "Atrasadas",  value: data.calibration.totals.overdue,          color: "#dc2626", bg: "#fee2e2" },
                  { label: "Próximas",   value: data.calibration.totals.upcoming,         color: "#d97706", bg: "#fef3c7" },
                  { label: "Em dia",     value: data.calibration.totals.ok,               color: "#059669", bg: "#d1fae5" },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: card.color }}>{card.label}</div>
                    <div className="text-[28px] font-extrabold text-gray-900">{card.value}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Equipamento", "Periodicidade", "Próxima Calibração", "Status"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.calibration.by_equipment.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Nenhum dado</td></tr>
                    ) : data.calibration.by_equipment.map((row) => {
                      const st = STATUS_LABEL[row.status];
                      return (
                        <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                          <td className="px-4 py-3 text-gray-600">{row.periodicity_days != null ? `${row.periodicity_days} dias` : "—"}</td>
                          <td className="px-4 py-3 text-gray-600">{fmtDate(row.next_calibration)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CHAMADOS ─────────────────────────────────────────────────── */}
          {tab === "chamados" && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Total de Chamados", value: String(data.tickets.totals.total), color: "#0363a9" },
                  { label: "Tempo Médio Aberto", value: data.tickets.totals.avg_open_days != null ? `${data.tickets.totals.avg_open_days} dias` : "—", color: "#d97706" },
                  { label: "Tempo Médio Resolução", value: data.tickets.totals.avg_resolution_days != null ? `${data.tickets.totals.avg_resolution_days} dias` : "—", color: "#059669" },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: card.color }}>{card.label}</div>
                    <div className="text-[24px] font-extrabold text-gray-900">{card.value}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* By type */}
                <div className="bg-white rounded-xl border border-gray-200 p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div className="text-[13px] font-bold text-gray-900 mb-3">Por Tipo</div>
                  {Object.keys(data.tickets.by_type).length === 0 ? (
                    <div className="text-[12px] text-gray-400">Sem dados</div>
                  ) : Object.entries(data.tickets.by_type).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-[13px] text-gray-700">{TICKET_TYPE_LABEL[type] ?? type}</span>
                      <span className="text-[13px] font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
                {/* By priority */}
                <div className="bg-white rounded-xl border border-gray-200 p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div className="text-[13px] font-bold text-gray-900 mb-3">Por Prioridade</div>
                  {Object.keys(data.tickets.by_priority).length === 0 ? (
                    <div className="text-[12px] text-gray-400">Sem dados</div>
                  ) : Object.entries(data.tickets.by_priority).map(([prio, count]) => {
                    const p = PRIORITY_LABEL[prio];
                    return (
                      <div key={prio} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: p?.bg ?? "#f3f4f6", color: p?.color ?? "#6b7280" }}>
                          {p?.label ?? prio}
                        </span>
                        <span className="text-[13px] font-semibold text-gray-900">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
