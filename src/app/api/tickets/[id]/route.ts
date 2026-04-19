import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTicketService } from "@/lib/services/ticket.service";
import { updateTicketSchema } from "@/lib/validations/ticket.schemas";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.TICKET_READ)) return forbiddenResponse();

    const supabase = await createSupabaseServerClient();
    const service = createTicketService(supabase);
    const ticket = await service.getById(id);

    if (!ticket) return notFoundResponse("Ticket not found");
    return NextResponse.json({ data: ticket });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.TICKET_UPDATE)) return forbiddenResponse();

    const body = await request.json();
    const input = updateTicketSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const service = createTicketService(supabase);
    const ticket = await service.update(id, user.id, input);

    return NextResponse.json({ data: ticket });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.TICKET_DELETE)) return forbiddenResponse();

    const supabase = await createSupabaseServerClient();
    const service = createTicketService(supabase);
    await service.delete(id, user.id, user.company_id ?? "");

    return NextResponse.json({ message: "Ticket deleted" });
  } catch (err) {
    return handleApiError(err);
  }
}
