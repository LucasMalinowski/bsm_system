import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base.repository";
import type { Company } from "@/types";

export class CompanyRepository extends BaseRepository<Company> {
  protected tableName = "companies";

  async findBySlug(slug: string): Promise<Company | null> {
    const { data, error } = await this.supabase
      .from("companies")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) return null;
    return data as Company;
  }

  async findAllWithStats(): Promise<(Company & { user_count: number })[]> {
    const { data, error } = await this.supabase
      .from("companies")
      .select(`
        *,
        profiles(count)
      `);

    if (error) throw new Error(error.message);

    return (data ?? []).map((c: Company & { profiles: [{ count: number }] }) => ({
      ...c,
      user_count: c.profiles?.[0]?.count ?? 0,
    }));
  }
}

export function createCompanyRepository(supabase: SupabaseClient) {
  return new CompanyRepository(supabase);
}
