import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTicketService } from "@/lib/services/ticket.service";
import { ticketFilterSchema, createTicketSchema } from "@/lib/validations/ticket.schemas";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.TICKET_READ)) return forbiddenResponse();

    const { searchParams } = new URL(request.url);
    const filters = ticketFilterSchema.parse(Object.fromEntries(searchParams));

    const supabase = await createSupabaseServerClient();
    const service = createTicketService(supabase);
    const result = await service.list(user.company_id!, filters);

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.TICKET_CREATE)) return forbiddenResponse();

    const body = await request.json();
    const input = createTicketSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const service = createTicketService(supabase);
    const ticket = await service.create(user.company_id!, user.id, input);

    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
