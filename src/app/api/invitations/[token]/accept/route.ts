import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createInvitationService } from "@/lib/services/invitation.service";
import { handleApiError } from "@/lib/utils/errors";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: "Sessão não encontrada. Clique no link do email novamente." }, { status: 401 });
    }

    const formData = await request.formData();
    const firstName = (formData.get("first_name") as string | null)?.trim() ?? "";
    const lastName = (formData.get("last_name") as string | null)?.trim() ?? "";
    const avatarFile = formData.get("avatar") as File | null;

    if (!firstName) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const service = createInvitationService(admin);
    await service.complete(token, user.id, firstName, lastName, avatarFile ?? undefined);

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
