import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createCalibrationService } from "@/lib/services/calibration.service";
import { handleApiError, unauthorizedResponse, notFoundResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();

    const supabase = createSupabaseAdminClient();
    const service = createCalibrationService(supabase);
    const doc = await service.getDocument(id);

    if (!doc) return notFoundResponse();
    return NextResponse.json({ data: doc });
  } catch (err) {
    return handleApiError(err);
  }
}
