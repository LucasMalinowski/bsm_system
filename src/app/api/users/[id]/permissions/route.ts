import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createUserService } from "@/lib/services/user.service";
import { z } from "zod";
import { isAdmin, isSuperAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/utils/errors";
import type { Permission } from "@/types";

type Params = { params: Promise<{ id: string }> };

const setPermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

async function targetIsInCallersCompany(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  targetId: string,
  callerCompanyId: string | null
): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("company_id").eq("id", targetId).maybeSingle();
  if (!data) return false;
  return data.company_id === callerCompanyId;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isAdmin(user) && user.id !== id) return forbiddenResponse();

    const supabase = await createSupabaseServerClient();

    if (isAdmin(user) && !isSuperAdmin(user) && user.id !== id) {
      const sameCompany = await targetIsInCallersCompany(supabase, id, user.company_id);
      if (!sameCompany) return notFoundResponse("Usuário não encontrado");
    }

    const service = createUserService(supabase);
    const permissions = await service.getPermissions(id);

    return NextResponse.json({ data: permissions });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isAdmin(user)) return forbiddenResponse();

    const supabase = await createSupabaseServerClient();

    if (!isSuperAdmin(user)) {
      const sameCompany = await targetIsInCallersCompany(supabase, id, user.company_id);
      if (!sameCompany) return notFoundResponse("Usuário não encontrado");
    }

    const body = await request.json();
    const { permissions } = setPermissionsSchema.parse(body);

    const service = createUserService(supabase);
    await service.setPermissions(id, permissions as Permission[]);

    return NextResponse.json({ message: "Permissions updated" });
  } catch (err) {
    return handleApiError(err);
  }
}
