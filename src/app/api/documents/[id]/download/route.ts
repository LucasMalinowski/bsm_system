import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDocumentService } from "@/lib/services/document.service";
import { can, PERMISSIONS, isSuperAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.DOCUMENT_READ)) return forbiddenResponse();

    const supabase = await createSupabaseServerClient();
    const service = createDocumentService(supabase);
    const doc = await service.getById(id, user.company_id, isSuperAdmin(user), user.role === "employee");

    if (!doc) return notFoundResponse("Document not found");

    const signedUrl = await service.getSignedUrl(doc.storage_path, 60);
    return NextResponse.redirect(signedUrl);
  } catch (err) {
    return handleApiError(err);
  }
}
