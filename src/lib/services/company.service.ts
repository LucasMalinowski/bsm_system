import type { SupabaseClient } from "@supabase/supabase-js";
import { createCompanyRepository } from "@/lib/repositories/company.repository";
import { createProfileRepository } from "@/lib/repositories/profile.repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/auth/permissions";
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
    // Use admin client to bypass RLS for cross-tenant provisioning
    const admin = createSupabaseAdminClient();
    const companyRepo = createCompanyRepository(admin);

    // Create company
    const company = await companyRepo.create({
      name: input.name,
      slug: input.slug,
      primary_color: input.primary_color ?? "#0363a9",
      secondary_color: input.secondary_color ?? "#008adb",
      accent_color: input.accent_color ?? "#e0f0fb",
      logo_url: null,
    });

    // Create admin user via Supabase Auth
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: input.admin_email,
      email_confirm: true,
      user_metadata: { name: input.admin_name },
    });

    if (authError) throw new Error(`Failed to create admin user: ${authError.message}`);

    // Update profile with company + admin role
    const profileRepo = createProfileRepository(admin);
    await profileRepo.update(authUser.user.id, {
      company_id: company.id,
      role: "admin",
      name: input.admin_name,
    });

    // Assign default admin permissions
    await profileRepo.setPermissions(authUser.user.id, DEFAULT_PERMISSIONS_BY_ROLE.admin);

    return company;
  }

  async update(id: string, input: UpdateCompanyInput): Promise<Company> {
    const repo = createCompanyRepository(this.supabase);
    return repo.update(id, input);
  }

  async delete(id: string): Promise<void> {
    const repo = createCompanyRepository(this.supabase);
    await repo.delete(id);
  }
}

export function createCompanyService(supabase: SupabaseClient) {
  return new CompanyService(supabase);
}
