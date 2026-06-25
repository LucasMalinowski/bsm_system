import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTicketService } from "@/lib/services/ticket.service";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { forbidden, redirect, notFound } from "next/navigation";
import { TicketDetailClient } from "@/components/tickets/ticket-detail-client";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!can(user, PERMISSIONS.TICKET_READ)) forbidden();

  const supabase = await createSupabaseServerClient();
  const service = createTicketService(supabase);
  const ticket = await service.getById(id);

  if (!ticket) notFound();

  return (
    <TicketDetailClient
      ticket={ticket}
      canUpdate={can(user, PERMISSIONS.TICKET_UPDATE)}
      canAssign={can(user, PERMISSIONS.TICKET_ASSIGN)}
      currentUserId={user.id}
    />
  );
}
