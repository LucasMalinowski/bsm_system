import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCompanyService } from "@/lib/services/company.service";
import { updateCompanySchema } from "@/lib/validations/company.schemas";
import { handleApiError, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();

    // Super admin can view any company; others can only view their own
    if (user.role !== "super_admin" && user.company_id !== id) return forbiddenResponse();

    const supabase = await createSupabaseServerClient();
    const service = createCompanyService(supabase);
    const company = await service.getById(id);

    if (!company) return notFoundResponse("Company not found");
    return NextResponse.json({ data: company });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();

    const isOwner = user.company_id === id && user.role === "admin";
    const isSuperAdmin = user.role === "super_admin";
    if (!isOwner && !isSuperAdmin) return forbiddenResponse();

    const body = await request.json();
    const input = updateCompanySchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const service = createCompanyService(supabase);
    const company = await service.update(id, input);

    return NextResponse.json({ data: company });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (user.role !== "super_admin") return forbiddenResponse();

    const supabase = await createSupabaseServerClient();
    const service = createCompanyService(supabase);
    await service.delete(id);

    return NextResponse.json({ message: "Company deleted" });
  } catch (err) {
    return handleApiError(err);
  }
}
