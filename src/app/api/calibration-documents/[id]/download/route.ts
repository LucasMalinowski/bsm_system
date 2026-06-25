import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, unauthorizedResponse, notFoundResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();

    const supabase = createSupabaseAdminClient();

    const { data: doc } = await supabase
      .from("calibration_documents")
      .select("storage_path, name")
      .eq("id", id)
      .single();

    if (!doc) return notFoundResponse();

    const { data: signed } = await supabase.storage
      .from("calibration-docs")
      .createSignedUrl(doc.storage_path, 300);

    if (!signed) return notFoundResponse("Arquivo não encontrado no storage");

    return NextResponse.redirect(signed.signedUrl);
  } catch (err) {
    return handleApiError(err);
  }
}
