import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createCalibrationService } from "@/lib/services/calibration.service";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const pointSchema = z.object({
  point_value: z.string().min(1),
  criterion: z.string().min(1),
  error_tolerance: z.number().nullable().optional(),
  sort_order: z.number().int().optional(),
});

const savePointsSchema = z.object({
  points: z.array(pointSchema),
});

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.EQUIPMENT_READ)) return forbiddenResponse();

    const supabase = createSupabaseAdminClient();

    if (user.role !== "super_admin") {
      const { data: eq } = await supabase
        .from("equipment").select("company_id").eq("id", id).single();
      if (!eq || (user.company_id && eq.company_id !== user.company_id))
        return forbiddenResponse();
    }

    const service = createCalibrationService(supabase);
    const points = await service.listPoints(id);

    return NextResponse.json({ data: points });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.EQUIPMENT_UPDATE)) return forbiddenResponse();

    const body = await request.json();
    const { points } = savePointsSchema.parse(body);

    const supabase = createSupabaseAdminClient();
    const service = createCalibrationService(supabase);
    const saved = await service.savePoints(id, points);

    return NextResponse.json({ data: saved });
  } catch (err) {
    return handleApiError(err);
  }
}
