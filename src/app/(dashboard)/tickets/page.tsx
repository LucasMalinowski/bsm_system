import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTicketService } from "@/lib/services/ticket.service";
import { ticketFilterSchema } from "@/lib/validations/ticket.schemas";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { forbidden, redirect } from "next/navigation";
import { TicketsListClient } from "@/components/tickets/tickets-list-client";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!can(user, PERMISSIONS.TICKET_READ)) forbidden();
  if (!user.company_id) redirect("/super-admin/companies");

  const params = await searchParams;
  const filters = ticketFilterSchema.parse(params);

  const supabase = await createSupabaseServerClient();
  const service = createTicketService(supabase);
  const result = await service.list(user.company_id, filters);

  return (
    <TicketsListClient
      tickets={result.data as Parameters<typeof TicketsListClient>[0]["tickets"]}
      total={result.pagination.total}
      totalPages={result.pagination.total_pages}
      page={result.pagination.page}
      canCreate={can(user, PERMISSIONS.TICKET_CREATE)}
      canDelete={can(user, PERMISSIONS.TICKET_DELETE)}
      currentStatus={params.status ?? ""}
      userRole={user.role}
    />
  );
}
