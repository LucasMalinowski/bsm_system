import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDocumentService } from "@/lib/services/document.service";
import { updateDocumentSchema } from "@/lib/validations/document.schemas";
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

    const signedUrl = await service.getSignedUrl(doc.storage_path);
    return NextResponse.json({ data: { ...doc, signed_url: signedUrl } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.DOCUMENT_UPDATE)) return forbiddenResponse();

    const body = await request.json();
    const input = updateDocumentSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const service = createDocumentService(supabase);
    const doc = await service.update(id, user.id, input, user.company_id, isSuperAdmin(user));

    if (!doc) return notFoundResponse("Document not found");

    return NextResponse.json({ data: doc });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isSuperAdmin(user)) return forbiddenResponse();

    const supabase = await createSupabaseServerClient();
    const service = createDocumentService(supabase);
    const deleted = await service.delete(id, user.id, user.company_id, isSuperAdmin(user));

    if (!deleted) return notFoundResponse("Document not found");

    return NextResponse.json({ message: "Document deleted" });
  } catch (err) {
    return handleApiError(err);
  }
}
