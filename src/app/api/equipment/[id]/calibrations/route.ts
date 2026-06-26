import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createCalibrationService } from "@/lib/services/calibration.service";
import { isSuperAdmin, can, PERMISSIONS } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const createRecordSchema = z.object({
  template_doc_id: z.string().uuid().nullable().optional(),
  performed_at: z.string().optional(),
  notes: z.string().nullable().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  child_storage_path: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.CALIBRATION_READ)) return forbiddenResponse();

    const supabase = createSupabaseAdminClient();

    const { data: equipment } = await supabase
      .from("equipment")
      .select("company_id")
      .eq("id", id)
      .single();

    if (!equipment) return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
    if (!isSuperAdmin(user) && equipment.company_id !== user.company_id) {
      return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
    }

    const service = createCalibrationService(supabase);
    const records = await service.listRecords(id);

    return NextResponse.json({ data: records });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isSuperAdmin(user)) return forbiddenResponse("Apenas o Super Admin pode registrar calibrações");

    const body = await request.json();
    const dto = createRecordSchema.parse(body);

    const supabase = createSupabaseAdminClient();

    const { data: equipment } = await supabase
      .from("equipment")
      .select("company_id, name, internal_code")
      .eq("id", id)
      .single();

    if (!equipment) return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });

    const service = createCalibrationService(supabase);
    const record = await service.createRecord(id, equipment.company_id, user.id, dto, dto.child_storage_path ?? undefined);

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
