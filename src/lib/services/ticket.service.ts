import type { SupabaseClient } from "@supabase/supabase-js";
import { createTicketRepository } from "@/lib/repositories/ticket.repository";
import { createAuditService } from "@/lib/services/audit.service";
import { createNotificationService } from "@/lib/services/notification.service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

  async list(companyId: string | null, filters: TicketFilterInput): Promise<PaginatedResponse<Ticket>> {
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
    const notif = createNotificationService(this.supabase);

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

    await notif.notifyAdminsOfTicket(
      companyId,
      ticket.title,
      ticket.id,
      ticket.is_support_request ?? false
    ).catch(console.error);

    return ticket;
  }

  async update(id: string, userId: string, input: UpdateTicketInput): Promise<Ticket> {
    const repo = createTicketRepository(this.supabase);
    const audit = createAuditService(this.supabase);

    // Fetch the current ticket once — used for both validation and audit diff.
    const before = await repo.findById(id);
    if (!before) throw new Error("Ticket not found");

    if (input.status) {
      const allowed = VALID_TRANSITIONS[before.status] ?? [];
      if (!allowed.includes(input.status)) {
        throw new Error(`Cannot transition from "${before.status}" to "${input.status}"`);
      }

      if (input.status === "resolved") {
        (input as Record<string, unknown>).resolved_at = new Date().toISOString();
      }
    }

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

    if (input.assigned_to && input.assigned_to !== before?.assigned_to) {
      const notif = createNotificationService(this.supabase);
      await notif.create({
        user_id: input.assigned_to,
        type: "ticket_assigned",
        title: "Chamado atribuído a você",
        body: `O chamado "${ticket.title}" foi atribuído a você.`,
        metadata: { ticket_id: id },
      }).catch(console.error);
    }

    if (input.status && before?.created_by && before.created_by !== userId) {
      const { data: creator } = await this.supabase
        .from("profiles")
        .select("id, name")
        .eq("id", before.created_by)
        .single();

      if (creator) {
        const adminClient = createSupabaseAdminClient();
        const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(before.created_by);
        const creatorEmail = authUser?.email ?? "";

        const notif = createNotificationService(this.supabase);
        await notif.notifyTicketStatusChange(
          creator.id,
          creatorEmail,
          creator.name,
          ticket.title,
          id,
          input.status
        ).catch(console.error);
      }
    }

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
