import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/auth/permissions";
import type { AuthUser, Permission } from "@/types";

export const IMPERSONATE_COOKIE = "bsm_impersonate";

// Per-process cache: avoids hitting the DB on every parallel request from the same user.
// TTL of 30s is acceptable for role/permission data that rarely changes.
const _profileCache = new Map<string, { user: AuthUser; expiresAt: number }>();
const PROFILE_CACHE_TTL_MS = 30_000;

function _getCached(userId: string): AuthUser | null {
  const entry = _profileCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _profileCache.delete(userId);
    return null;
  }
  return entry.user;
}

function _setCache(userId: string, user: AuthUser): void {
  _profileCache.set(userId, { user, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
  // Prevent unbounded growth in long-running processes
  if (_profileCache.size > 500) {
    const firstKey = _profileCache.keys().next().value;
    if (firstKey) _profileCache.delete(firstKey);
  }
}

export function invalidateProfileCache(userId: string): void {
  _profileCache.delete(userId);
}

async function _fetchProfile(
  db: SupabaseClient,
  authUser: User,
  cookieStore: Awaited<ReturnType<typeof cookies>> | null,
  allowImpersonation: boolean
): Promise<AuthUser | null> {
  const [profileResult, permissionResult] = await Promise.all([
    db
      .from("profiles")
      .select("name,role,company_id,avatar_url,is_active")
      .eq("id", authUser.id)
      .single(),
    db
      .from("user_permissions")
      .select("permission")
      .eq("user_id", authUser.id),
  ]);

  const profile = profileResult.data;
  if (!profile) return null;
  // Deactivated users have a valid Supabase Auth session but must be treated as logged out.
  if (profile.is_active === false) return null;

  let impersonating: string | null = null;
  let effectiveCompanyId: string | null = profile.company_id;
  let permissions: Permission[] =
    DEFAULT_PERMISSIONS_BY_ROLE[profile.role as keyof typeof DEFAULT_PERMISSIONS_BY_ROLE] ?? [];

  if (profile.role === "super_admin") {
    if (allowImpersonation && cookieStore) {
      const cookie = cookieStore.get(IMPERSONATE_COOKIE);
      if (cookie?.value) {
        impersonating = cookie.value;
        effectiveCompanyId = cookie.value;
      }
    }
  } else {
    const permissionRows = permissionResult.data;
    permissions =
      permissionRows && permissionRows.length > 0
        ? (permissionRows.map((r) => r.permission) as Permission[])
        : permissions;
  }

  return {
    id: authUser.id,
    email: authUser.email!,
    name: profile.name,
    role: profile.role,
    company_id: effectiveCompanyId,
    avatar_url: profile.avatar_url,
    permissions,
    impersonating,
  };
}

// Used by the refresh/login routes that already have an authenticated Supabase user.
export async function resolveAuthUser(
  _supabase: SupabaseClient,
  authUser: User,
  options: { allowImpersonationCookie?: boolean } = {}
): Promise<AuthUser | null> {
  // Skip cache when impersonation cookie is relevant (super_admin only)
  if (!options.allowImpersonationCookie) {
    const cached = _getCached(authUser.id);
    if (cached) return cached;
  }

  const db = createSupabaseAdminClient();
  const cookieStore = options.allowImpersonationCookie ? await cookies() : null;
  const user = await _fetchProfile(db, authUser, cookieStore, options.allowImpersonationCookie ?? false);
  if (user && !options.allowImpersonationCookie) _setCache(user.id, user);
  return user;
}

export const getServerSession = cache(async (): Promise<AuthUser | null> => {
  try {
    // Bearer token path — used by the mobile app (no cookies, just Authorization header).
    const headerStore = await headers();
    const authorization = headerStore.get("authorization");
    if (authorization?.startsWith("Bearer ")) {
      const token = authorization.slice(7);
      const admin = createSupabaseAdminClient();
      const { data: { user }, error } = await admin.auth.getUser(token);
      if (error || !user) return null;

      const cached = _getCached(user.id);
      if (cached) return cached;

      const authUser = await _fetchProfile(admin, user, null, false);
      if (authUser) _setCache(authUser.id, authUser);
      return authUser;
    }

    // Cookie path — used by the web app. proxy.ts already validated the token
    // this request, so getSession() is a safe local JWT decode (no network call).
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return null;

    const cached = _getCached(user.id);
    // Super-admins have an impersonation cookie that can change between requests —
    // bypass the cache so the cookie is always read fresh.
    if (cached && cached.role !== "super_admin") return cached;

    const cookieStore = await cookies();
    const authUser = await _fetchProfile(supabase, user, cookieStore, true);
    if (authUser && authUser.role !== "super_admin") _setCache(authUser.id, authUser);
    return authUser;
  } catch {
    return null;
  }
});
