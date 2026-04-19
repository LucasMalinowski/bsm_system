import type { SupabaseClient } from "@supabase/supabase-js";
import { createCompanyRepository } from "@/lib/repositories/company.repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Company } from "@/types";
import type { CreateCompanyInput, UpdateCompanyInput } from "@/lib/validations/company.schemas";

export class CompanyService {
  constructor(private supabase: SupabaseClient) {}

  async getById(id: string): Promise<Company | null> {
    const repo = createCompanyRepository(this.supabase);
    return repo.findById(id);
  }

  async getTheme(id: string) {
    const company = await this.getById(id);
    if (!company) return null;
    return {
      primary_color: company.primary_color,
      secondary_color: company.secondary_color,
      accent_color: company.accent_color,
      logo_url: company.logo_url,
    };
  }

  async listAll(): Promise<Company[]> {
    const repo = createCompanyRepository(this.supabase);
    const { data } = await repo.findMany({ orderBy: "name", ascending: true });
    return data;
  }

  async listAllWithStats() {
    const repo = createCompanyRepository(this.supabase);
    return repo.findAllWithStats();
  }

  async create(input: CreateCompanyInput): Promise<Company> {
    const companyRepo = createCompanyRepository(this.supabase);
    const company = await companyRepo.create({
      name: input.name,
      slug: input.slug,
      primary_color: input.primary_color ?? "#0363a9",
      secondary_color: input.secondary_color ?? "#008adb",
      accent_color: input.accent_color ?? "#e0f0fb",
      logo_url: null,
    });
    return company;
  }

  async update(id: string, input: UpdateCompanyInput): Promise<Company> {
    const repo = createCompanyRepository(this.supabase);
    return repo.update(id, input);
  }

  async delete(id: string): Promise<void> {
    const admin = createSupabaseAdminClient();
    const repo = createCompanyRepository(admin);
    const company = await repo.findById(id);
    if (!company) throw new Error("Company not found");

    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id")
      .eq("company_id", id);

    if (profilesError) throw new Error(profilesError.message);

    const profileIds = (profiles ?? []).map((profile) => profile.id);
    const cleanupPrefixes = [
      { bucket: "company-assets", prefix: id },
      { bucket: "documents", prefix: id },
      { bucket: "equipment-images", prefix: id },
      { bucket: "avatars", prefix: id },
    ] as const;

    const deleteStoragePrefix = async (bucket: string, prefix: string) => {
      const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
      if (error) throw new Error(`Failed to list ${bucket} files: ${error.message}`);

      const paths = (data ?? [])
        .filter((item) => item.name)
        .map((item) => `${prefix}/${item.name}`);

      if (paths.length === 0) return;

      const { error: removeError } = await admin.storage.from(bucket).remove(paths);
      if (removeError) throw new Error(`Failed to remove ${bucket} files: ${removeError.message}`);
    };

    const { error: auditError } = await admin
      .from("audit_logs")
      .delete()
      .eq("company_id", id);
    if (auditError) throw new Error(auditError.message);

    await repo.delete(id);

    const authDeletions = await Promise.allSettled(
      profileIds.map((profileId) => admin.auth.admin.deleteUser(profileId))
    );
    authDeletions.forEach((result) => {
      if (result.status === "rejected") {
        console.warn("Failed to delete Supabase Auth user during company cleanup", result.reason);
      } else if (result.value.error) {
        console.warn("Supabase Auth user delete returned an error during company cleanup", result.value.error.message);
      }
    });

    const { error: profileDeleteError } = await admin
      .from("profiles")
      .delete()
      .eq("company_id", id);
    if (profileDeleteError) throw new Error(profileDeleteError.message);

    await Promise.allSettled(
      cleanupPrefixes.map(({ bucket, prefix }) => deleteStoragePrefix(bucket, prefix))
    );
  }
}

export function createCompanyService(supabase: SupabaseClient) {
  return new CompanyService(supabase);
}
