import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createCalibrationService } from "@/lib/services/calibration.service";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

export async function GET() {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();

    const supabase = createSupabaseAdminClient();
    const service = createCalibrationService(supabase);
    const documents = await service.listDocuments();

    return NextResponse.json({ data: documents });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isSuperAdmin(user)) return forbiddenResponse("Apenas o Super Admin pode criar documentos de calibração");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const description = formData.get("description") as string | null;

    if (!file || !name) {
      return NextResponse.json({ error: "Arquivo e nome são obrigatórios" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const fileName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const storagePath = `templates/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("calibration-docs")
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const service = createCalibrationService(supabase);
    const doc = await service.createDocument(user.id, { name, description }, storagePath);

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
