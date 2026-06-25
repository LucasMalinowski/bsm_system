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

    // Delete everything that can't be safely retried via FK cascade FIRST, while the
    // company row still exists. If this fails partway, the company is still there and
    // the whole operation can just be retried — nothing is left half-deleted.
    const authDeletions = await Promise.allSettled(
      profileIds.map((profileId) => admin.auth.admin.deleteUser(profileId))
    );
    const authFailures = authDeletions
      .map((result, i) => ({ result, profileId: profileIds[i] }))
      .filter(({ result }) => result.status === "rejected" || (result.status === "fulfilled" && result.value.error));

    if (authFailures.length > 0) {
      authFailures.forEach(({ result, profileId }) => {
        const reason = result.status === "rejected" ? result.reason : result.value.error?.message;
        console.error(`Failed to delete Supabase Auth user ${profileId} during company cleanup`, reason);
      });
      throw new Error(
        `Falha ao remover ${authFailures.length} usuário(s) da empresa. Nenhuma alteração foi feita — tente novamente.`
      );
    }

    // auth.users delete cascades to profiles (profiles.id references auth.users.id on
    // delete cascade), but clean up explicitly by id too as a safety net.
    if (profileIds.length > 0) {
      const { error: profileDeleteError } = await admin
        .from("profiles")
        .delete()
        .in("id", profileIds);
      if (profileDeleteError) throw new Error(profileDeleteError.message);
    }

    const { error: auditError } = await admin
      .from("audit_logs")
      .delete()
      .eq("company_id", id);
    if (auditError) throw new Error(auditError.message);

    const storageResults = await Promise.allSettled(
      cleanupPrefixes.map(({ bucket, prefix }) => deleteStoragePrefix(bucket, prefix))
    );
    storageResults.forEach((result, i) => {
      if (result.status === "rejected") {
        console.warn(`Failed to clean up storage bucket ${cleanupPrefixes[i].bucket} during company cleanup`, result.reason);
      }
    });

    // Company row deleted last: by this point nothing else still depends on it, so this
    // step can't leave anything orphaned.
    await repo.delete(id);
  }
}

export function createCompanyService(supabase: SupabaseClient) {
  return new CompanyService(supabase);
}
