import type { SupabaseClient } from "@supabase/supabase-js";
import { createProfileRepository } from "@/lib/repositories/profile.repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/auth/permissions";
import type { Permission, UserRole } from "@/types";

export class UserService {
  constructor(private supabase: SupabaseClient) {}

  async listByCompany(companyId: string) {
    const repo = createProfileRepository(this.supabase);
    const profiles = await repo.findByCompany(companyId);

    // Attach permissions to each profile
    const withPerms = await Promise.all(
      profiles.map(async (p) => {
        const permissions = await repo.getPermissions(p.id);
        return { ...p, permissions };
      })
    );

    return withPerms;
  }

  async getPermissions(userId: string): Promise<Permission[]> {
    const repo = createProfileRepository(this.supabase);
    return repo.getPermissions(userId);
  }

  async setPermissions(userId: string, permissions: Permission[]): Promise<void> {
    const repo = createProfileRepository(this.supabase);
    await repo.setPermissions(userId, permissions);
  }

  async updateRole(userId: string, role: UserRole): Promise<void> {
    const repo = createProfileRepository(this.supabase);
    await repo.update(userId, { role });
    // Reset permissions to role defaults
    await repo.setPermissions(userId, DEFAULT_PERMISSIONS_BY_ROLE[role]);
  }

  async invite(companyId: string, email: string, name: string, role: UserRole = "employee"): Promise<void> {
    const admin = createSupabaseAdminClient();

    const { data: authUser, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: false, // sends invite email
      user_metadata: { name },
    });

    if (error) throw new Error(error.message);

    const repo = createProfileRepository(admin);
    await repo.update(authUser.user.id, { company_id: companyId, role, name });
    await repo.setPermissions(authUser.user.id, DEFAULT_PERMISSIONS_BY_ROLE[role]);
  }

  async deactivate(userId: string): Promise<void> {
    const repo = createProfileRepository(this.supabase);
    await repo.deactivate(userId);
  }
}

export function createUserService(supabase: SupabaseClient) {
  return new UserService(supabase);
}
