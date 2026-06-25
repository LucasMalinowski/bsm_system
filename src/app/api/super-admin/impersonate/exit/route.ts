import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";
import { IMPERSONATE_COOKIE } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditService } from "@/lib/services/audit.service";

export async function POST(request: NextRequest) {
  const user = await getServerSession();
  if (!user) return unauthorizedResponse();
  if (user.role !== "super_admin") return forbiddenResponse();

  const impersonatedCompanyId = request.cookies.get(IMPERSONATE_COOKIE)?.value ?? null;
  if (impersonatedCompanyId) {
    const supabase = await createSupabaseServerClient();
    await createAuditService(supabase).log({
      companyId: impersonatedCompanyId,
      userId: user.id,
      action: "update",
      resourceType: "company",
      resourceId: impersonatedCompanyId,
      newData: { impersonation: "ended" },
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(IMPERSONATE_COOKIE);

  return response;
}
