import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEquipmentService } from "@/lib/services/equipment.service";
import { equipmentFilterSchema, createEquipmentSchema } from "@/lib/validations/equipment.schemas";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.EQUIPMENT_READ)) return forbiddenResponse();

    const { searchParams } = new URL(request.url);
    const filters = equipmentFilterSchema.parse(Object.fromEntries(searchParams));

    const supabase = await createSupabaseServerClient();
    const service = createEquipmentService(supabase);
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
    if (!can(user, PERMISSIONS.EQUIPMENT_CREATE)) return forbiddenResponse();

    const body = await request.json();
    const input = createEquipmentSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const service = createEquipmentService(supabase);
    const equipment = await service.create(user.company_id!, user.id, input);

    return NextResponse.json({ data: equipment }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
