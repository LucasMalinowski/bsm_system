import { NextRequest, NextResponse } from "next/server";
import { getServerSession, invalidateProfileCache } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/utils/errors";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(["employee", "admin"]).optional(),
  avatar_url: z.string().url().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const currentUser = await getServerSession();
    if (!currentUser) return unauthorizedResponse();

    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, name, role, avatar_url, is_active, company_id, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!profile) return notFoundResponse("Usuário não encontrado");
    if (!isAdmin(currentUser) && currentUser.id !== id) return forbiddenResponse();
    if (currentUser.role !== "super_admin" && profile.company_id !== currentUser.company_id) {
      return notFoundResponse("Usuário não encontrado");
    }

    const admin = createSupabaseAdminClient();
    const { data: authUser } = await admin.auth.admin.getUserById(id);

    return NextResponse.json({ data: { ...profile, email: authUser?.user?.email ?? "" } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const currentUser = await getServerSession();
    if (!currentUser) return unauthorizedResponse();
    if (!isAdmin(currentUser)) return forbiddenResponse();

    const { id } = await params;
    const body = await request.json();
    const input = updateUserSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    let query = supabase.from("profiles").update(input).eq("id", id);
    // Company admins are scoped to their own company; super_admin's company_id
    // is null by design, so this filter must be skipped for them (their RLS
    // policy already grants unrestricted access via is_super_admin()).
    if (currentUser.role !== "super_admin") {
      query = query.eq("company_id", currentUser.company_id!);
    }
    const { data, error } = await query.select("id, name, role, avatar_url").single();

    if (error) throw new Error(error.message);

    invalidateProfileCache(id);
    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}
