import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthUser, Permission, UserRole } from "@/types";

export interface Profile {
  id: string;
  company_id: string | null;
  role: UserRole;
  name: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class ProfileRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as Profile;
  }

  async findByCompany(companyId: string): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name");

    if (error) throw new Error(error.message);
    return (data ?? []) as Profile[];
  }

  async update(id: string, payload: Partial<Profile>): Promise<Profile> {
    const { data, error } = await this.supabase
      .from("profiles")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Profile;
  }

  async getPermissions(userId: string): Promise<Permission[]> {
    const { data } = await this.supabase
      .from("user_permissions")
      .select("permission")
      .eq("user_id", userId);

    return (data?.map((r) => r.permission) ?? []) as Permission[];
  }

  async setPermissions(userId: string, permissions: Permission[]): Promise<void> {
    // Delete existing and insert new (replace strategy)
    const { error: deleteError } = await this.supabase.from("user_permissions").delete().eq("user_id", userId);
    if (deleteError) throw new Error(deleteError.message);

    if (permissions.length > 0) {
      const { error: insertError } = await this.supabase.from("user_permissions").insert(
        permissions.map((p) => ({ user_id: userId, permission: p }))
      );
      if (insertError) throw new Error(insertError.message);
    }
  }

  async deactivate(id: string): Promise<void> {
    await this.supabase.from("profiles").update({ is_active: false }).eq("id", id);
  }
}

export function createProfileRepository(supabase: SupabaseClient) {
  return new ProfileRepository(supabase);
}
