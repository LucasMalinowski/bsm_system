import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEquipmentService } from "@/lib/services/equipment.service";
import { can, PERMISSIONS, isSuperAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.EQUIPMENT_CREATE)) return forbiddenResponse();

    const { id } = await params;
    const body = await request.json();
    const { model } = body;
    if (!model) return NextResponse.json({ ok: true });

    // SA without impersonation can pass company_id in body
    const companyId =
      isSuperAdmin(user) && !user.company_id
        ? (body.company_id ?? "")
        : user.company_id ?? "";

    if (!companyId) return NextResponse.json({ ok: true });

    const supabase = await createSupabaseServerClient();
    const service = createEquipmentService(supabase);

    const sourceEquipments = await service.findByModel(model, companyId);
    const sourceIds = sourceEquipments.map((e) => e.id).filter((eid) => eid !== id);

    if (sourceIds.length > 0) {
      await service.copyDocumentsFromModel(id, sourceIds, user.id, companyId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
