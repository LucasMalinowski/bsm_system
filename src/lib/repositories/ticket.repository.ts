import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base.repository";
import type { Ticket, TicketComment } from "@/types";
import type { TicketFilterInput } from "@/lib/validations/ticket.schemas";

export class TicketRepository extends BaseRepository<Ticket> {
  protected tableName = "tickets";

  async findFiltered(
    companyId: string,
    filters: TicketFilterInput
  ): Promise<{ data: Ticket[]; count: number }> {
    const { page = 1, limit = 20, search, status, priority, assigned_to, equipment_id, sort = "updated_at", order = "desc" } = filters;

    let query = this.supabase
      .from("tickets")
      .select(`
        *,
        equipment:equipment(id,name,internal_code),
        creator:profiles!tickets_created_by_fkey(name),
        assignee:profiles!tickets_assigned_to_fkey(name,avatar_url)
      `, { count: "exact" })
      .eq("company_id", companyId);

    if (search) query = query.ilike("title", `%${search}%`);
    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);
    if (assigned_to) query = query.eq("assigned_to", assigned_to);
    if (equipment_id) query = query.eq("equipment_id", equipment_id);

    const { data, error, count } = await query
      .order(sort, { ascending: order === "asc" })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new Error(error.message);
    return { data: (data ?? []) as Ticket[], count: count ?? 0 };
  }

  async findWithComments(id: string): Promise<(Ticket & { comments: TicketComment[] }) | null> {
    const { data: ticket, error } = await this.supabase
      .from("tickets")
      .select(`
        *,
        equipment:equipment(id,name,internal_code),
        creator:profiles!tickets_created_by_fkey(name),
        assignee:profiles!tickets_assigned_to_fkey(name,avatar_url)
      `)
      .eq("id", id)
      .single();

    if (error) return null;

    const { data: comments } = await this.supabase
      .from("ticket_comments")
      .select("*, user:profiles(name,avatar_url)")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    return { ...(ticket as Ticket), comments: (comments ?? []) as TicketComment[] };
  }

  async getStatusCounts(companyId: string): Promise<Record<string, number>> {
    const { data } = await this.supabase
      .from("tickets")
      .select("status")
      .eq("company_id", companyId);

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }
    return counts;
  }
}

export function createTicketRepository(supabase: SupabaseClient) {
  return new TicketRepository(supabase);
}
