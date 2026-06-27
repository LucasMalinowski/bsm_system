import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTicketService } from "@/lib/services/ticket.service";
import { createCommentSchema } from "@/lib/validations/ticket.schemas";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.TICKET_COMMENT)) return forbiddenResponse();

    const body = await request.json();
    const input = createCommentSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const service = createTicketService(supabase);
    const comment = await service.addComment(id, user.id, input);

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
