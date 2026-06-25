import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, unauthorizedResponse } from "@/lib/utils/errors";
import { isSuperAdmin } from "@/lib/auth/permissions";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    // SA without impersonation can pass company_id as query param, same as
    // equipment/tickets/documents — mirrors mobile's company-switcher.
    const companyId =
      isSuperAdmin(user) && !user.company_id
        ? searchParams.get("company_id")
        : user.company_id;

    if (!companyId) return NextResponse.json({ data: [] });

    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("profiles")
      .select("id, name, role, avatar_url, is_active")
      .eq("company_id", companyId)
      .order("name");

    if (role) {
      query = query.eq("role", role);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // profiles has no email column — it lives on auth.users. Enrich via the
    // admin client (company-sized lists, so a single listUsers page covers it).
    const admin = createSupabaseAdminClient();
    const ids = new Set((data ?? []).map((p) => p.id));
    const emailById = new Map<string, string>();
    if (ids.size > 0) {
      const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const authUser of authData?.users ?? []) {
        if (ids.has(authUser.id)) emailById.set(authUser.id, authUser.email ?? "");
      }
    }

    const enriched = (data ?? []).map((p) => ({ ...p, email: emailById.get(p.id) ?? "" }));

    return NextResponse.json({ data: enriched });
  } catch (err) {
    return handleApiError(err);
  }
}
