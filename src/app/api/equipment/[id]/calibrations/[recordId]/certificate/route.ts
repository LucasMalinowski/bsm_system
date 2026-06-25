import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createCalibrationService } from "@/lib/services/calibration.service";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string; recordId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: equipmentId, recordId } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isSuperAdmin(user)) return forbiddenResponse();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 });

    const supabase = createSupabaseAdminClient();

    const ext = file.name.split(".").pop() ?? "pdf";
    const storagePath = `certificates/${equipmentId}/${recordId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("calibration-records")
      .upload(storagePath, file, { contentType: file.type, upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const service = createCalibrationService(supabase);
    await service.attachCertificate(recordId, storagePath);

    return NextResponse.json({ data: { certificate_storage_path: storagePath } });
  } catch (err) {
    return handleApiError(err);
  }
}
