import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEquipmentService } from "@/lib/services/equipment.service";
import { equipmentFilterSchema, createEquipmentSchema } from "@/lib/validations/equipment.schemas";
import { can, PERMISSIONS, isSuperAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.EQUIPMENT_READ)) return forbiddenResponse();

    const { searchParams } = new URL(request.url);
    const filters = equipmentFilterSchema.parse(Object.fromEntries(searchParams));

    // SA without a company sees all; SA impersonating a company is scoped to it
    const companyId: string | null =
      isSuperAdmin(user) && !user.company_id
        ? (searchParams.get("company_id") ?? null)
        : user.company_id ?? null;

    const supabase = await createSupabaseServerClient();
    const service = createEquipmentService(supabase);
    const result = await service.list(companyId, filters);

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

    // SA without impersonation: use company_id from body
    const companyId =
      isSuperAdmin(user) && !user.company_id
        ? (input.company_id ?? null)
        : user.company_id;

    if (!companyId) return forbiddenResponse("company_id required");

    const supabase = await createSupabaseServerClient();

    // Resolve category_name → category_id if provided without an ID
    let resolvedInput = { ...input };
    if (!resolvedInput.category_id && resolvedInput.category_name) {
      const { data: existingCat } = await supabase
        .from("equipment_categories")
        .select("id")
        .eq("company_id", companyId)
        .ilike("name", resolvedInput.category_name)
        .single();

      if (existingCat) {
        resolvedInput.category_id = existingCat.id;
      } else {
        const { data: newCat } = await supabase
          .from("equipment_categories")
          .insert({ company_id: companyId, name: resolvedInput.category_name })
          .select("id")
          .single();
        if (newCat) resolvedInput.category_id = newCat.id;
      }
    }
    delete resolvedInput.category_name;

    const service = createEquipmentService(supabase);
    const equipment = await service.create(companyId, user.id, resolvedInput);

    return NextResponse.json({ data: equipment }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
