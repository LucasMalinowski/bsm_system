import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTicketService } from "@/lib/services/ticket.service";
import { ticketFilterSchema } from "@/lib/validations/ticket.schemas";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/ticket-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils/format";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!can(user, PERMISSIONS.TICKET_READ)) redirect("/dashboard");
  if (!user.company_id) redirect("/super-admin/companies");

  const params = await searchParams;
  const filters = ticketFilterSchema.parse(params);

  const supabase = await createSupabaseServerClient();
  const service = createTicketService(supabase);
  const result = await service.list(user.company_id, filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chamados</h1>
          <p className="text-sm text-gray-500">{result.pagination.total} chamados</p>
        </div>
        {can(user, PERMISSIONS.TICKET_CREATE) && (
          <Link href="/tickets/new">
            <Button>
              <Plus className="h-4 w-4" />
              Novo Chamado
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Título</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Prioridade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Equipamento</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Responsável</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {result.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    Nenhum chamado encontrado
                  </td>
                </tr>
              ) : (
                result.data.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="font-medium text-[var(--brand-primary)] hover:underline"
                      >
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <TicketStatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-3">
                      <TicketPriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ticket.equipment ? (
                        <Link href={`/equipment/${ticket.equipment.id}`} className="hover:underline">
                          {ticket.equipment.name}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ticket.assignee?.name ?? "Não atribuído"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {formatDateTime(ticket.updated_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
