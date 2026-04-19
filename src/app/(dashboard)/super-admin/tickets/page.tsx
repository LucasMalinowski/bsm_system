import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { forbidden, redirect } from "next/navigation";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/ticket-status-badge";
import { formatDateTime } from "@/lib/utils/format";
import Link from "next/link";
import { Search } from "lucide-react";

export default async function SATicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") forbidden();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const search = sp.search ?? "";
  const status = sp.status ?? "";
  const limit = 25;

  const supabase = createSupabaseAdminClient();

  let dataQuery = supabase
    .from("tickets")
    .select(
      `id,title,status,priority,updated_at,
      company:companies(name),
      equipment:equipment(name),
      assignee:profiles!tickets_assigned_to_fkey(name)`
    );

  let countQuery = supabase
    .from("tickets")
    .select("id", { count: "exact", head: true });

  if (search) {
    dataQuery = dataQuery.ilike("title", `%${search}%`);
    countQuery = countQuery.ilike("title", `%${search}%`);
  }
  if (status) {
    dataQuery = dataQuery.eq("status", status);
    countQuery = countQuery.eq("status", status);
  }

  const [
    { data, error },
    { count, error: countError },
  ] = await Promise.all([
    dataQuery.order("updated_at", { ascending: false }).range((page - 1) * limit, page * limit - 1),
    countQuery,
  ]);

  if (error) throw new Error(error.message);
  if (countError) throw new Error(countError.message);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 lg:p-7 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Chamados</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{total} chamados em todas as empresas</p>
        </div>
        <form method="GET" className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Buscar chamado..."
              className="h-9 w-60 rounded-lg border border-gray-300 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-[var(--brand-primary)] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)]"
            />
          </div>
          <select
            name="status"
            defaultValue={status}
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[var(--brand-primary)]"
          >
            <option value="">Todos os status</option>
            <option value="open">Aberto</option>
            <option value="in_progress">Em andamento</option>
            <option value="waiting">Aguardando</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
          </select>
          <button
            type="submit"
            className="h-9 rounded-lg bg-[var(--brand-primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90"
          >
            Buscar
          </button>
        </form>
      </div>

      <div
        className="bg-white border border-gray-200 rounded-xl overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Empresa</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Título</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Prioridade</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Equipamento</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Responsável</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Nenhum chamado encontrado
                  </td>
                </tr>
              ) : (
                (data ?? []).map((ticket) => (
                  <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50/70">
                    <td className="px-4 py-3 text-xs text-gray-500">{ticket.company?.name}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{ticket.title}</td>
                    <td className="px-4 py-3"><TicketStatusBadge status={ticket.status} /></td>
                    <td className="px-4 py-3"><TicketPriorityBadge priority={ticket.priority} /></td>
                    <td className="px-4 py-3 text-gray-600">{ticket.equipment?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{ticket.assignee?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDateTime(ticket.updated_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
              <span>Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`?page=${page - 1}&search=${search}&status=${status}`} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Anterior</Link>
                )}
                {page < totalPages && (
                  <Link href={`?page=${page + 1}&search=${search}&status=${status}`} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Próxima</Link>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
