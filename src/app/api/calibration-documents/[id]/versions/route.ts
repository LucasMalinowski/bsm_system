import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createCalibrationService } from "@/lib/services/calibration.service";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isSuperAdmin(user)) return forbiddenResponse();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const notes = formData.get("notes") as string | null;

    if (!file) return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 });

    const supabase = createSupabaseAdminClient();

    const fileName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const storagePath = `templates/${id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("calibration-docs")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) throw new Error(uploadError.message);

    const service = createCalibrationService(supabase);
    const version = await service.addVersion(id, user.id, storagePath, file.size, notes ?? undefined);

    return NextResponse.json({ data: version }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
