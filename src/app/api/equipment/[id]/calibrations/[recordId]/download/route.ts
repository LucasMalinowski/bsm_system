import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { can, PERMISSIONS, isSuperAdmin } from "@/lib/auth/permissions";
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
      .select("child_storage_path, equipment_id, company_id, performed_at")
      .eq("id", recordId)
      .single();

    if (error || !record) return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
    if (!isSuperAdmin(user) && record.company_id !== user.company_id) {
      return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
    }
    if (!record.child_storage_path) return NextResponse.json({ error: "Nenhuma planilha gerada para este registro" }, { status: 404 });

    const { data, error: signErr } = await supabase.storage
      .from("calibration-records")
      .createSignedUrl(record.child_storage_path, 60 * 5); // 5 min

    if (signErr || !data?.signedUrl) {
      return NextResponse.json({ error: "Erro ao gerar link de download" }, { status: 500 });
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (err) {
    return handleApiError(err);
  }
}
