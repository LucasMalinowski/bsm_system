import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createEquipmentService } from "@/lib/services/equipment.service";

type Params = { params: Promise<{ token: string }> };

// Public QR scan endpoint — resolves token to equipment and redirects.
// Uses the admin client (bypasses RLS) since this is unauthenticated by design —
// same pattern as InvitationService.getByToken().
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    const supabase = createSupabaseAdminClient();
    const service = createEquipmentService(supabase);
    const equipment = await service.getByQRToken(token);

    if (!equipment) {
      return NextResponse.redirect(new URL("/not-found", req.nextUrl.origin));
    }

    return NextResponse.redirect(
      new URL(`/equipment/${equipment.id}`, req.nextUrl.origin)
    );
  } catch {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
}
