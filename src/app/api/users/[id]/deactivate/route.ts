import { NextRequest, NextResponse } from "next/server";
import { getServerSession, invalidateProfileCache } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createProfileRepository } from "@/lib/repositories/profile.repository";
import { isAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const currentUser = await getServerSession();
    if (!currentUser) return unauthorizedResponse();
    if (!isAdmin(currentUser)) return forbiddenResponse();

    const { id } = await params;
    if (id === currentUser.id) {
      return NextResponse.json({ error: "Você não pode desativar sua própria conta" }, { status: 400 });
    }

    const body = await request.json();
    const is_active = body.is_active === true;

    const supabase = await createSupabaseServerClient();
    const repo = createProfileRepository(supabase);
    const profile = await repo.findById(id);
    if (!profile) return notFoundResponse("User not found");

    await repo.update(id, { is_active });
    invalidateProfileCache(id);

    return NextResponse.json({ data: { id, is_active } });
  } catch (err) {
    return handleApiError(err);
  }
}
