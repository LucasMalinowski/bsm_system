import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEquipmentService } from "@/lib/services/equipment.service";
import { can, PERMISSIONS, isSuperAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.EQUIPMENT_READ)) return forbiddenResponse();

    const { searchParams } = new URL(request.url);
    const model = searchParams.get("model");
    if (!model) return NextResponse.json({ data: [] });

    // SA without impersonation can pass company_id as query param
    const companyId =
      isSuperAdmin(user) && !user.company_id
        ? (searchParams.get("company_id") ?? "")
        : user.company_id ?? "";

    if (!companyId) return NextResponse.json({ data: [] });

    const supabase = await createSupabaseServerClient();
    const service = createEquipmentService(supabase);
    const docs = await service.getDocumentsByModel(model, companyId);

    return NextResponse.json({ data: docs });
  } catch (err) {
    return handleApiError(err);
  }
}
