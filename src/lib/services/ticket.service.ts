import type { SupabaseClient } from "@supabase/supabase-js";
import { createTicketRepository } from "@/lib/repositories/ticket.repository";
import { createAuditService } from "@/lib/services/audit.service";
import type { Ticket, TicketComment, PaginatedResponse } from "@/types";
import type {
  CreateTicketInput,
  UpdateTicketInput,
  TicketFilterInput,
  CreateCommentInput,
} from "@/lib/validations/ticket.schemas";

const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ["in_progress", "closed"],
  in_progress: ["waiting", "resolved", "closed"],
  waiting: ["in_progress", "resolved", "closed"],
  resolved: ["closed", "open"],
  closed: ["open"],
};

export class TicketService {
  constructor(private supabase: SupabaseClient) {}

  async list(companyId: string, filters: TicketFilterInput): Promise<PaginatedResponse<Ticket>> {
    const repo = createTicketRepository(this.supabase);
    const { data, count } = await repo.findFiltered(companyId, filters);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    return {
      data,
      pagination: { page, limit, total: count, total_pages: Math.ceil(count / limit) },
    };
  }

  async getById(id: string) {
    const repo = createTicketRepository(this.supabase);
    return repo.findWithComments(id);
  }

  async getStatusCounts(companyId: string) {
    const repo = createTicketRepository(this.supabase);
    return repo.getStatusCounts(companyId);
  }

  async create(companyId: string, userId: string, input: CreateTicketInput): Promise<Ticket> {
    const repo = createTicketRepository(this.supabase);
    const audit = createAuditService(this.supabase);

    const ticket = await repo.create({
      ...input,
      company_id: companyId,
      created_by: userId,
      status: "open",
    } as Omit<Ticket, "id" | "created_at" | "updated_at">);

    await audit.log({
      companyId,
      userId,
      action: "create",
      resourceType: "ticket",
      resourceId: ticket.id,
      resourceName: ticket.title,
      newData: input as Record<string, unknown>,
    });

    return ticket;
  }

  async update(id: string, userId: string, input: UpdateTicketInput): Promise<Ticket> {
    const repo = createTicketRepository(this.supabase);
    const audit = createAuditService(this.supabase);

    if (input.status) {
      const current = await repo.findById(id);
      if (!current) throw new Error("Ticket not found");

      const allowed = VALID_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(input.status)) {
        throw new Error(`Cannot transition from "${current.status}" to "${input.status}"`);
      }

      if (input.status === "resolved") {
        (input as Record<string, unknown>).resolved_at = new Date().toISOString();
      }
    }

    const before = await repo.findById(id);
    const ticket = await repo.update(id, input);

    await audit.log({
      companyId: ticket.company_id,
      userId,
      action: "update",
      resourceType: "ticket",
      resourceId: id,
      resourceName: ticket.title,
      oldData: before as unknown as Record<string, unknown>,
      newData: input as Record<string, unknown>,
    });

    return ticket;
  }

  async addComment(ticketId: string, userId: string, input: CreateCommentInput): Promise<TicketComment> {
    const { data, error } = await this.supabase
      .from("ticket_comments")
      .insert({ ticket_id: ticketId, user_id: userId, body: input.body })
      .select("*, user:profiles(name,avatar_url)")
      .single();

    if (error) throw new Error(error.message);
    return data as TicketComment;
  }

  async delete(id: string, userId: string, companyId: string): Promise<void> {
    const repo = createTicketRepository(this.supabase);
    const audit = createAuditService(this.supabase);
    const before = await repo.findById(id);
    await repo.delete(id);
    await audit.log({
      companyId,
      userId,
      action: "delete",
      resourceType: "ticket",
      resourceId: id,
      resourceName: before?.title,
      oldData: before as unknown as Record<string, unknown>,
    });
  }
}

export function createTicketService(supabase: SupabaseClient) {
  return new TicketService(supabase);
}
