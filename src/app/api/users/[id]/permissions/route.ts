import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createUserService } from "@/lib/services/user.service";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";
import type { Permission } from "@/types";

type Params = { params: Promise<{ id: string }> };

const setPermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isAdmin(user) && user.id !== id) return forbiddenResponse();

    const supabase = await createSupabaseServerClient();
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

    const body = await request.json();
    const { permissions } = setPermissionsSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const service = createUserService(supabase);
    await service.setPermissions(id, permissions as Permission[]);

    return NextResponse.json({ message: "Permissions updated" });
  } catch (err) {
    return handleApiError(err);
  }
}
