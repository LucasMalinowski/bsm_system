import { NextRequest, NextResponse } from "next/server";
import { createInvitationService } from "@/lib/services/invitation.service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, notFoundResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    // Use admin client directly — public unauthenticated endpoint
    const admin = createSupabaseAdminClient();
    const service = createInvitationService(admin);
    const invite = await service.getByToken(token);

    if (!invite) return notFoundResponse("Convite não encontrado");
    if (invite.accepted_at) {
      return NextResponse.json({ error: "Este convite já foi utilizado" }, { status: 410 });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "Este convite expirou" }, { status: 410 });
    }

    return NextResponse.json({
      data: {
        email: invite.email,
        company_name: invite.company?.name,
        company_logo: invite.company?.logo_url,
        company_color: invite.company?.primary_color,
        expires_at: invite.expires_at,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
