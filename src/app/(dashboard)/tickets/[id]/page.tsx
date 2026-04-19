import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTicketService } from "@/lib/services/ticket.service";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { redirect, notFound } from "next/navigation";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/ticket-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/utils/format";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!can(user, PERMISSIONS.TICKET_READ)) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const service = createTicketService(supabase);
  const ticket = await service.getById(id);

  if (!ticket) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tickets" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{ticket.title}</h1>
          <p className="text-sm text-gray-400">
            Aberto por {ticket.creator?.name} · {formatDateTime(ticket.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle>Comentários ({ticket.comments?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments?.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar name={comment.user?.name ?? "?"} src={comment.user?.avatar_url} size="sm" />
                  <div className="flex-1 rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{comment.user?.name}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(comment.created_at)}</p>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>
                  </div>
                </div>
              ))}
              {ticket.comments?.length === 0 && (
                <p className="text-sm text-gray-400">Nenhum comentário ainda</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Responsável</p>
                <p className="font-medium">{ticket.assignee?.name ?? "Não atribuído"}</p>
              </div>
              {ticket.equipment && (
                <div>
                  <p className="text-xs text-gray-500">Equipamento</p>
                  <Link href={`/equipment/${ticket.equipment.id}`} className="font-medium text-[var(--brand-primary)] hover:underline">
                    {ticket.equipment.name}
                  </Link>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Atualizado</p>
                <p>{formatDateTime(ticket.updated_at)}</p>
              </div>
              {ticket.resolved_at && (
                <div>
                  <p className="text-xs text-gray-500">Resolvido em</p>
                  <p>{formatDateTime(ticket.resolved_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
