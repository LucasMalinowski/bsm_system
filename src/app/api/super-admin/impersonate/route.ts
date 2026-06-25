import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/utils/errors";
import { IMPERSONATE_COOKIE } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditService } from "@/lib/services/audit.service";
import { checkRateLimit, getClientIp } from "@/lib/utils/rate-limit";
import { z } from "zod";

const schema = z.object({ company_id: z.string().uuid() });

export async function POST(request: NextRequest) {
  const user = await getServerSession();
  if (!user) return unauthorizedResponse();
  if (user.role !== "super_admin") return forbiddenResponse();

  const allowed = await checkRateLimit(`impersonate:${getClientIp(request)}`, 20, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em um minuto." }, { status: 429 });
  }

  const body = await request.json();
  const { company_id } = schema.parse(body);

  const supabase = await createSupabaseServerClient();
  const { data: company } = await supabase.from("companies").select("id, name").eq("id", company_id).maybeSingle();
  if (!company) return notFoundResponse("Empresa não encontrada");

  await createAuditService(supabase).log({
    companyId: company_id,
    userId: user.id,
    action: "update",
    resourceType: "company",
    resourceId: company_id,
    resourceName: company.name,
    newData: { impersonation: "started" },
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(IMPERSONATE_COOKIE, company_id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return response;
}
