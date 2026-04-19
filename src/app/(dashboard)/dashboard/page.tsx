import { getServerSession } from "@/lib/auth/get-session";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createTicketService } from "@/lib/services/ticket.service";
import { createEquipmentService } from "@/lib/services/equipment.service";
import { createCompanyService } from "@/lib/services/company.service";
import { formatDate } from "@/lib/utils/format";
import Link from "next/link";

const PRIORITY_COLORS: Record<string, string> = {
  low: "#9ca3af", medium: "#3b82f6", high: "#f59e0b", critical: "#ef4444",
};
const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa", medium: "Média", high: "Alta", critical: "Crítica",
};
const STATUS_LABELS: Record<string, { bg: string; text: string; label: string }> = {
  active:            { bg: "#dcfce7", text: "#166534", label: "Ativo" },
  inactive:          { bg: "#f3f4f6", text: "#374151", label: "Inativo" },
  under_maintenance: { bg: "#fef9c3", text: "#854d0e", label: "Manutenção" },
  calibration:       { bg: "#dbeafe", text: "#1e40af", label: "Calibração" },
  retired:           { bg: "#fee2e2", text: "#b91c1c", label: "Descartado" },
};
const TICKET_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  open:        { bg: "#dbeafe", text: "#1e40af", label: "Aberto" },
  in_progress: { bg: "#fef9c3", text: "#854d0e", label: "Em Andamento" },
  waiting:     { bg: "#f3f4f6", text: "#374151", label: "Aguardando" },
  resolved:    { bg: "#dcfce7", text: "#166534", label: "Resolvido" },
  closed:      { bg: "#f3f4f6", text: "#374151", label: "Fechado" },
};

function StatCard({
  label, value, iconBg, iconColor, href,
  icon,
}: {
  label: string; value: number; iconBg: string; iconColor: string;
  href: string; icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="block">
      <div
        className="bg-white border border-gray-200 rounded-[14px] p-5 flex flex-col gap-3.5 transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] cursor-pointer"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-gray-500">{label}</span>
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: iconBg, color: iconColor }}>
            {icon}
          </div>
        </div>
        <div className="text-[32px] font-extrabold text-gray-900 leading-none">{value}</div>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await getServerSession();
  const supabase = await createSupabaseServerClient();

  /* ── Super admin view ── */
  if (user?.role === "super_admin") {
    const admin = createSupabaseAdminClient();
    const companyService = createCompanyService(admin);

    const [
      companies,
      { count: equipmentCount },
      { count: openTicketCount },
      { count: userCount },
      { data: calibrationRows },
      { data: recentEquipmentRows },
      { data: activeTicketRows },
    ] = await Promise.all([
      companyService.listAll(),
      admin.from("equipment").select("id", { count: "exact", head: true }),
      admin.from("tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      admin
        .from("equipment")
        .select("id,name, company:companies(name)")
        .eq("status", "calibration")
        .order("updated_at", { ascending: false })
        .limit(3),
      admin
        .from("equipment")
        .select("id,internal_code,name,status,next_calibration, company:companies(name)")
        .order("updated_at", { ascending: false })
        .limit(5),
      admin
        .from("tickets")
        .select("id,title,status,priority, equipment:equipment(name), company:companies(name)")
        .in("status", ["open", "in_progress", "waiting"])
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

    const firstName = user.name?.split(" ")[0];
    const calibrationEquipment =
      (calibrationRows as Array<{ id: string; name: string; company?: { name: string } | null }> | null)?.map((row) => ({
        id: row.id,
        label: row.company?.name ? `${row.name} · ${row.company.name}` : row.name,
      })) ?? [];

    const recentEquipment =
      (recentEquipmentRows as Array<{
        id: string;
        internal_code: string;
        name: string;
        status: string;
        next_calibration: string | null;
        company?: { name: string } | null;
      }> | null) ?? [];

    const activeTickets =
      (activeTicketRows as Array<{
        id: string;
        title: string;
        status: string;
        priority: string;
        equipment?: { name: string } | null;
        company?: { name: string } | null;
      }> | null) ?? [];

    return (
      <div className="p-4 lg:p-7 flex flex-col gap-5 lg:gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[20px] lg:text-[24px] font-extrabold text-gray-900">Olá, {firstName} 👋</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">Visão global do sistema</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3.5">
          <StatCard
            label="Empresas" value={companies.length} href="/super-admin/companies"
            iconBg="#eff6ff" iconColor="#2563eb"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
          />
          <StatCard
            label="Total de Equipamentos" value={equipmentCount ?? 0} href="/super-admin/equipment"
            iconBg="#eff6ff" iconColor="#2563eb"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
          />
          <StatCard
            label="Chamados Abertos" value={openTicketCount ?? 0} href="/super-admin/tickets"
            iconBg="#fff7ed" iconColor="#ea580c"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"/></svg>}
          />
          <StatCard
            label="Usuários Ativos" value={userCount ?? 0} href="/super-admin/users"
            iconBg="#f0fdf4" iconColor="#16a34a"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          />
        </div>

        {calibrationEquipment.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-yellow-300 px-4 py-3.5" style={{ background: "#fef9c3" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="1.8" strokeLinecap="round" className="flex-shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <path d="M12 9v4M12 17h.01"/>
            </svg>
            <div className="flex-1">
              <span className="text-[13px] font-bold text-yellow-800">Calibração Pendente — </span>
              <span className="text-[13px] text-yellow-700">
                {calibrationEquipment.map((equipment) => equipment.label).join(", ")} aguarda calibração
              </span>
            </div>
            <Link href="/super-admin/equipment" className="text-[12px] font-semibold text-yellow-800 hover:underline flex-shrink-0">
              Ver equipamentos
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-[14px] font-bold text-gray-900">Equipamentos Recentes</span>
              <Link href="/super-admin/equipment" className="text-[12px] font-medium text-[var(--brand-primary)] hover:underline">Ver todos →</Link>
            </div>
            {recentEquipment.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-gray-400">Nenhum equipamento cadastrado</div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide">Nome</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Próx. Cal.</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEquipment.map((equipment) => {
                    const st = STATUS_LABELS[equipment.status] ?? STATUS_LABELS.inactive;
                    return (
                      <tr key={equipment.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link href="/super-admin/equipment" className="font-semibold text-[var(--brand-primary)] hover:underline">{equipment.name}</Link>
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">{equipment.internal_code}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{equipment.company?.name ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-[12px] text-gray-400 flex items-center gap-1">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                            {formatDate(equipment.next_calibration)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-[14px] font-bold text-gray-900">Chamados Ativos</span>
              <Link href="/super-admin/tickets" className="text-[12px] font-medium text-[var(--brand-primary)] hover:underline">Ver todos →</Link>
            </div>
            {activeTickets.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-gray-400">Nenhum chamado ativo</div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide">Título</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Prior.</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTickets.map((ticket) => {
                    const ts = TICKET_STATUS[ticket.status] ?? TICKET_STATUS.open;
                    const pc = PRIORITY_COLORS[ticket.priority] ?? "#9ca3af";
                    const pl = PRIORITY_LABELS[ticket.priority] ?? ticket.priority;
                    return (
                      <tr key={ticket.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link href="/super-admin/tickets" className="font-semibold text-gray-900 hover:underline">{ticket.title}</Link>
                          <div className="text-[11px] text-gray-400 mt-0.5">{ticket.equipment?.name ?? "—"}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{ticket.company?.name ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" style={{ background: ts.bg, color: ts.text }}>{ts.label}</span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pc }} />
                            <span className="text-[12px] text-gray-600">{pl}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Company user view ── */
  let equipmentCount = 0;
  let calibrationEquipment: Array<{ id: string; name: string }> = [];
  let ticketCounts: Record<string, number> = {};
  let recentEquipment: Array<{ id: string; internal_code: string; name: string; status: string; next_calibration: string | null }> = [];
  let activeTickets: Array<{ id: string; title: string; status: string; priority: string; equipment?: { name: string } | null }> = [];

  if (user?.company_id) {
    const equipmentService = createEquipmentService(supabase);
    const ticketService = createTicketService(supabase);

    const [equipmentResult, equipmentAll, counts, ticketsResult] = await Promise.all([
      equipmentService.list(user.company_id, { page: 1, limit: 1, sort: "updated_at", order: "desc" }),
      equipmentService.list(user.company_id, { page: 1, limit: 20, sort: "updated_at", order: "desc" }),
      ticketService.getStatusCounts(user.company_id),
      ticketService.list(user.company_id, { page: 1, limit: 10, sort: "updated_at", order: "desc" }),
    ]);

    equipmentCount = equipmentResult.pagination.total;
    ticketCounts = counts;
    recentEquipment = (equipmentAll.data as Array<{ id: string; internal_code: string; name: string; status: string; next_calibration: string | null }>).slice(0, 5);
    calibrationEquipment = (equipmentAll.data as Array<{ id: string; name: string; status: string }>)
      .filter((e) => e.status === "calibration")
      .map((e) => ({ id: e.id, name: e.name }));
    activeTickets = (ticketsResult.data as Array<{ id: string; title: string; status: string; priority: string; equipment?: { name: string } | null }>)
      .filter((t) => t.status !== "resolved" && t.status !== "closed")
      .slice(0, 5);
  }

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const firstName = user?.name?.split(" ")[0];
  const canReadEquipment = can(user ?? null, PERMISSIONS.EQUIPMENT_READ);
  const canReadTickets = can(user ?? null, PERMISSIONS.TICKET_READ);
  const canCreateTickets = can(user ?? null, PERMISSIONS.TICKET_CREATE);

  return (
    <div className="p-4 lg:p-7 flex flex-col gap-5 lg:gap-6">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] lg:text-[24px] font-extrabold text-gray-900">Olá, {firstName} 👋</h1>
          <p className="text-[13px] text-gray-500 mt-0.5 capitalize">{today} — Aqui está o resumo do sistema</p>
        </div>
        {canCreateTickets && (
          <Link
            href="/tickets/new"
            className="hidden lg:flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--brand-primary)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Chamado
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3.5">
        {canReadEquipment && <StatCard label="Total de Equipamentos" value={equipmentCount} href="/equipment" iconBg="#eff6ff" iconColor="#2563eb"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
        />}
        {canReadTickets && <StatCard label="Chamados Abertos" value={ticketCounts["open"] ?? 0} href="/tickets" iconBg="#fff7ed" iconColor="#ea580c"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"/></svg>}
        />}
        {canReadTickets && <StatCard label="Em Andamento" value={ticketCounts["in_progress"] ?? 0} href="/tickets" iconBg="#fefce8" iconColor="#ca8a04"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
        />}
        {canReadTickets && <StatCard label="Resolvidos" value={ticketCounts["resolved"] ?? 0} href="/tickets" iconBg="#f0fdf4" iconColor="#16a34a"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
        />}
      </div>

      {/* Calibration alert */}
      {canReadEquipment && calibrationEquipment.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-300 px-4 py-3.5" style={{ background: "#fef9c3" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="1.8" strokeLinecap="round" className="flex-shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <path d="M12 9v4M12 17h.01"/>
          </svg>
          <div className="flex-1">
            <span className="text-[13px] font-bold text-yellow-800">Calibração Pendente — </span>
            <span className="text-[13px] text-yellow-700">{calibrationEquipment.map((e) => e.name).join(", ")} aguarda calibração</span>
          </div>
          <Link href="/equipment" className="text-[12px] font-semibold text-yellow-800 hover:underline flex-shrink-0">
            Ver equipamentos
          </Link>
        </div>
      )}

      {/* Desktop 2-col tables / Mobile stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {/* Recent equipment */}
        {canReadEquipment && <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <span className="text-[14px] font-bold text-gray-900">Equipamentos Recentes</span>
            <Link href="/equipment" className="text-[12px] font-medium text-[var(--brand-primary)] hover:underline">Ver todos →</Link>
          </div>
          {recentEquipment.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-gray-400">Nenhum equipamento cadastrado</div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide">Nome</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Próx. Cal.</th>
                </tr>
              </thead>
              <tbody>
                {recentEquipment.map((eq) => {
                  const st = STATUS_LABELS[eq.status] ?? STATUS_LABELS.inactive;
                  return (
                    <tr key={eq.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/equipment/${eq.id}`} className="font-semibold text-[var(--brand-primary)] hover:underline">{eq.name}</Link>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">{eq.internal_code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-[12px] text-gray-400 flex items-center gap-1">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                          {formatDate(eq.next_calibration)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>}

        {/* Active tickets */}
        {canReadTickets && <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <span className="text-[14px] font-bold text-gray-900">Chamados Ativos</span>
            <Link href="/tickets" className="text-[12px] font-medium text-[var(--brand-primary)] hover:underline">Ver todos →</Link>
          </div>
          {activeTickets.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-gray-400">Nenhum chamado ativo</div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide">Título</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Prior.</th>
                </tr>
              </thead>
              <tbody>
                {activeTickets.map((t) => {
                  const ts = TICKET_STATUS[t.status] ?? TICKET_STATUS.open;
                  const pc = PRIORITY_COLORS[t.priority] ?? "#9ca3af";
                  const pl = PRIORITY_LABELS[t.priority] ?? t.priority;
                  return (
                    <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/tickets/${t.id}`} className="font-semibold text-gray-900 hover:underline">{t.title}</Link>
                        <div className="text-[11px] text-gray-400 mt-0.5">{t.equipment?.name ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" style={{ background: ts.bg, color: ts.text }}>{ts.label}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pc }} />
                          <span className="text-[12px] text-gray-600">{pl}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>}
      </div>
    </div>
  );
}
