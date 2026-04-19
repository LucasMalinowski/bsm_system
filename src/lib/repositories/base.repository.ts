import type { SupabaseClient } from "@supabase/supabase-js";

export interface FindManyOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
  filters?: Record<string, unknown>;
}

export abstract class BaseRepository<T extends { id: string }> {
  protected abstract tableName: string;

  constructor(protected supabase: SupabaseClient) {}

  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as T;
  }

  async findMany(options: FindManyOptions = {}): Promise<{ data: T[]; count: number }> {
    const { page = 1, limit = 20, orderBy = "created_at", ascending = false, filters = {} } = options;

    let query = this.supabase
      .from(this.tableName)
      .select("*", { count: "exact" });

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== "") {
        query = query.eq(key, value);
      }
    }

    const { data, error, count } = await query
      .order(orderBy, { ascending })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new Error(error.message);
    return { data: (data ?? []) as T[], count: count ?? 0 };
  }

  async create(payload: Omit<T, "id" | "created_at" | "updated_at">): Promise<T> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as T;
  }

  async update(id: string, payload: Partial<Omit<T, "id" | "created_at">>): Promise<T> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as T;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
  }

  async count(filters: Record<string, unknown> = {}): Promise<number> {
    let query = this.supabase
      .from(this.tableName)
      .select("*", { count: "exact", head: true });

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    const { count, error } = await query;
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
}
