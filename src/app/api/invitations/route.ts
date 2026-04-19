import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInvitationService } from "@/lib/services/invitation.service";
import { isAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "employee"]).default("employee"),
  company_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isAdmin(user) && user.role !== "super_admin") return forbiddenResponse();

    const body = await request.json();
    const input = schema.parse(body);

    const companyId =
      user.role === "super_admin"
        ? input.company_id ?? user.company_id
        : user.company_id;

    if (!companyId) {
      return NextResponse.json({ error: "company_id is required" }, { status: 400 });
    }

    const appBaseUrl = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    const supabase = await createSupabaseServerClient();
    const service = createInvitationService(supabase);
    await service.create({
      email: input.email,
      role: input.role,
      company_id: companyId,
      invited_by: user.id,
      appBaseUrl,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
