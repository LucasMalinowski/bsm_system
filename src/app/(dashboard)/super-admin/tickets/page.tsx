import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/ticket-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils/format";
import Link from "next/link";

export default async function SATicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") redirect("/dashboard");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const search = sp.search ?? "";
  const status = sp.status ?? "";
  const limit = 50;

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("tickets")
    .select(
      `*,
      company:companies(name),
      equipment:equipment(name),
      assignee:profiles!tickets_assigned_to_fkey(name)`,
      { count: "exact" }
    );

  if (search) query = query.ilike("title", `%${search}%`);
  if (status) query = query.eq("status", status);

  const { data, count, error } = await query
    .order("updated_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chamados — Global</h1>
          <p className="text-sm text-gray-500">{total} chamados em todas as empresas</p>
        </div>
        <form method="GET" className="flex gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Buscar chamado..."
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none"
          >
            <option value="">Todos os status</option>
            <option value="open">Aberto</option>
            <option value="in_progress">Em andamento</option>
            <option value="waiting">Aguardando</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
          </select>
          <button type="submit" className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800">
            Buscar
          </button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Empresa</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Título</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Prioridade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Equipamento</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Responsável</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Atualizado</th>
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
                  <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50">
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
        </CardContent>
      </Card>
    </div>
  );
}
