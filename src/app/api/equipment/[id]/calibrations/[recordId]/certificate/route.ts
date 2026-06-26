import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createCalibrationService } from "@/lib/services/calibration.service";
import { can, isSuperAdmin, PERMISSIONS } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string; recordId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { recordId } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.CALIBRATION_READ)) return forbiddenResponse();

    const supabase = createSupabaseAdminClient();

    const { data: record, error } = await supabase
      .from("calibration_records")
      .select("certificate_storage_path, company_id")
      .eq("id", recordId)
      .single();

    if (error || !record) return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
    if (!isSuperAdmin(user) && record.company_id !== user.company_id) {
      return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
    }
    if (!record.certificate_storage_path) {
      return NextResponse.json({ error: "Nenhum certificado anexado a este registro" }, { status: 404 });
    }

    const { data, error: signErr } = await supabase.storage
      .from("calibration-records")
      .createSignedUrl(record.certificate_storage_path, 60 * 5); // 5 min

    if (signErr || !data?.signedUrl) {
      return NextResponse.json({ error: "Erro ao gerar link de visualização" }, { status: 500 });
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (err) {
    return handleApiError(err);
  }
}

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
