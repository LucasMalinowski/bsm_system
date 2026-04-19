import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base.repository";
import type { Equipment, EquipmentHistory } from "@/types";
import type { EquipmentFilterInput } from "@/lib/validations/equipment.schemas";

export class EquipmentRepository extends BaseRepository<Equipment> {
  protected tableName = "equipment";

  async findFiltered(
    companyId: string,
    filters: EquipmentFilterInput
  ): Promise<{ data: Equipment[]; count: number }> {
    const { page = 1, limit = 20, search, status, category_id, sort = "updated_at", order = "desc" } = filters;

    let query = this.supabase
      .from("equipment")
      .select("*, category:equipment_categories(id,name)", { count: "exact" })
      .eq("company_id", companyId);

    if (search) {
      query = query.or(`name.ilike.%${search}%,internal_code.ilike.%${search}%,serial_number.ilike.%${search}%`);
    }
    if (status) query = query.eq("status", status);
    if (category_id) query = query.eq("category_id", category_id);

    const { data, error, count } = await query
      .order(sort, { ascending: order === "asc" })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new Error(error.message);
    return { data: (data ?? []) as Equipment[], count: count ?? 0 };
  }

  async findByQRToken(token: string): Promise<Equipment | null> {
    const { data, error } = await this.supabase
      .from("equipment")
      .select("*, category:equipment_categories(id,name)")
      .eq("qr_code_token", token)
      .single();

    if (error) return null;
    return data as Equipment;
  }

  async findWithHistory(id: string): Promise<(Equipment & { history: EquipmentHistory[] }) | null> {
    const { data: equipment, error } = await this.supabase
      .from("equipment")
      .select("*, category:equipment_categories(id,name)")
      .eq("id", id)
      .single();

    if (error) return null;

    const { data: history } = await this.supabase
      .from("equipment_history")
      .select("*, user:profiles(name)")
      .eq("equipment_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    return { ...(equipment as Equipment), history: (history ?? []) as EquipmentHistory[] };
  }

  async addHistory(
    equipmentId: string,
    userId: string,
    action: string,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.supabase.from("equipment_history").insert({
      equipment_id: equipmentId,
      user_id: userId,
      action,
      description,
      metadata,
    });
  }
}

export function createEquipmentRepository(supabase: SupabaseClient) {
  return new EquipmentRepository(supabase);
}
