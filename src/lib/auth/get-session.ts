import { cookies } from "next/headers";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/auth/permissions";
import type { AuthUser, Permission } from "@/types";

export const IMPERSONATE_COOKIE = "bsm_impersonate";

export const getServerSession = cache(async (): Promise<AuthUser | null> => {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("name,role,company_id,avatar_url")
      .eq("id", user.id)
      .single();

    if (!profile) return null;

    // Check for super_admin impersonation cookie
    let impersonating: string | null = null;
    let effectiveCompanyId: string | null = profile.company_id;
    let permissions: Permission[] =
      DEFAULT_PERMISSIONS_BY_ROLE[profile.role as keyof typeof DEFAULT_PERMISSIONS_BY_ROLE] ?? [];

    if (profile.role === "super_admin") {
      const cookieStore = await cookies();
      const cookie = cookieStore.get(IMPERSONATE_COOKIE);
      if (cookie?.value) {
        impersonating = cookie.value;
        effectiveCompanyId = cookie.value;
      }
    } else {
      const { data: permissionRows } = await supabase
        .from("user_permissions")
        .select("permission")
        .eq("user_id", user.id);

      // Fall back to role defaults if no explicit permissions are set yet
      permissions =
        permissionRows && permissionRows.length > 0
          ? (permissionRows.map((r) => r.permission) as Permission[])
          : permissions;
    }

    return {
      id: user.id,
      email: user.email!,
      name: profile.name,
      role: profile.role,
      company_id: effectiveCompanyId,
      avatar_url: profile.avatar_url,
      permissions,
      impersonating,
    };
  } catch {
    return null;
  }
});
