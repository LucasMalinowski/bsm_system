import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createCompanyService } from "@/lib/services/company.service";
import { createInvitationService } from "@/lib/services/invitation.service";
import { createCompanySchema } from "@/lib/validations/company.schemas";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

export async function GET() {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (user.role !== "super_admin") return forbiddenResponse();

    const supabase = createSupabaseAdminClient();
    const service = createCompanyService(supabase);
    const companies = await service.listAllWithStats();

    return NextResponse.json({ data: companies });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (user.role !== "super_admin") return forbiddenResponse();

    const body = await request.json();
    const input = createCompanySchema.parse(body);

    const supabase = createSupabaseAdminClient();
    const service = createCompanyService(supabase);
    const company = await service.create(input);
    const invitationService = createInvitationService(supabase);
    const appBaseUrl = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    await invitationService.create({
      email: input.admin_email,
      role: "admin",
      company_id: company.id,
      invited_by: user.id,
      appBaseUrl,
    });

    return NextResponse.json({ data: company }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
