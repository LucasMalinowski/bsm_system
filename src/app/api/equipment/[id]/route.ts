import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createEquipmentService } from "@/lib/services/equipment.service";
import { updateEquipmentSchema, type UpdateEquipmentInput } from "@/lib/validations/equipment.schemas";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.EQUIPMENT_READ)) return forbiddenResponse();

    const supabase = await createSupabaseServerClient();
    const service = createEquipmentService(supabase);
    const equipment = await service.getWithHistory(id);

    if (!equipment) return notFoundResponse("Equipment not found");
    return NextResponse.json({ data: equipment });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.EQUIPMENT_UPDATE)) return forbiddenResponse();

    const body = await request.json();
    const { company_id: _cid, ...rest } = body;
    const input = updateEquipmentSchema.parse(rest);

    const mutableInput = { ...input } as Record<string, unknown>;
    if (mutableInput.category_name) {
      const admin = createSupabaseAdminClient();
      const { data: eq } = await admin.from("equipment").select("company_id").eq("id", id).single();
      const cid = eq?.company_id;
      if (cid) {
        const { data: existing } = await admin
          .from("equipment_categories").select("id")
          .eq("company_id", cid).ilike("name", mutableInput.category_name as string).maybeSingle();
        if (existing) {
          mutableInput.category_id = existing.id;
        } else {
          const { data: newCat } = await admin
            .from("equipment_categories")
            .insert({ company_id: cid, name: mutableInput.category_name })
            .select("id").single();
          if (newCat) mutableInput.category_id = newCat.id;
        }
      }
      delete mutableInput.category_name;
    }

    const supabase = await createSupabaseServerClient();
    const service = createEquipmentService(supabase);
    const equipment = await service.update(id, user.id, mutableInput as UpdateEquipmentInput);

    return NextResponse.json({ data: equipment });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.EQUIPMENT_DELETE)) return forbiddenResponse();

    const supabase = await createSupabaseServerClient();
    const service = createEquipmentService(supabase);
    await service.delete(id, user.id, user.company_id ?? "");

    return NextResponse.json({ message: "Equipment deleted" });
  } catch (err) {
    return handleApiError(err);
  }
}
