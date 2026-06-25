import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDocumentService } from "@/lib/services/document.service";
import { documentFilterSchema, uploadDocumentSchema } from "@/lib/validations/document.schemas";
import { can, PERMISSIONS, isSuperAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.DOCUMENT_READ)) return forbiddenResponse();

    const { searchParams } = new URL(request.url);
    const filters = documentFilterSchema.parse(Object.fromEntries(searchParams));

    // SA without impersonation can pass company_id as query param
    const companyId =
      isSuperAdmin(user) && !user.company_id
        ? searchParams.get("company_id")
        : user.company_id;

    if (!companyId) return forbiddenResponse("company_id required");

    const supabase = await createSupabaseServerClient();
    const service = createDocumentService(supabase);
    const result = await service.list(companyId, filters, user.role === "employee");

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isSuperAdmin(user)) return forbiddenResponse("Apenas o Super Admin pode criar novos documentos");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const meta = {
      name: formData.get("name") as string || file.name,
      description: formData.get("description") as string | null,
      category_id: formData.get("category_id") as string | null,
      equipment_id: formData.get("equipment_id") as string | null,
    };

    const input = uploadDocumentSchema.parse(meta);

    // SA without impersonation: use company_id from formData
    const companyId =
      isSuperAdmin(user) && !user.company_id
        ? (formData.get("company_id") as string | null) ?? null
        : user.company_id;

    if (!companyId) return forbiddenResponse("company_id required");

    const supabase = await createSupabaseServerClient();
    const service = createDocumentService(supabase);
    const doc = await service.upload(companyId, user.id, file, input);

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
