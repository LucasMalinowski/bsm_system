import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import type { Notification, CreateNotificationDTO } from "@/types";

export class NotificationService {
  private resend: Resend | null;

  constructor(private supabase: SupabaseClient) {
    this.resend = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;
  }

  async create(dto: CreateNotificationDTO): Promise<void> {
    await this.supabase.from("notifications").insert({
      user_id: dto.user_id,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      metadata: dto.metadata ?? null,
    });
  }

  async createMany(dtos: CreateNotificationDTO[]): Promise<void> {
    if (dtos.length === 0) return;
    await this.supabase.from("notifications").insert(dtos.map((d) => ({
      user_id: d.user_id,
      type: d.type,
      title: d.title,
      body: d.body,
      metadata: d.metadata ?? null,
    })));
  }

  async list(userId: string, unreadOnly = false): Promise<Notification[]> {
    let query = this.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.is("read_at", null);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as Notification[];
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) return;
    const from = process.env.RESEND_FROM_EMAIL ?? "BSM System <noreply@bsm.com.br>";
    await this.resend.emails.send({ from, to, subject, html }).catch(console.error);
  }

  async notifyAdminsOfTicket(
    companyId: string,
    ticketTitle: string,
    ticketId: string,
    isSupportRequest: boolean
  ): Promise<void> {
    let profileQuery = this.supabase
      .from("profiles")
      .select("id, name")
      .eq("role", isSupportRequest ? "super_admin" : "admin");

    if (!isSupportRequest) {
      profileQuery = profileQuery.eq("company_id", companyId);
    }

    const { data: profiles } = await profileQuery;

    if (!profiles || profiles.length === 0) return;

    const type = "ticket_created" as const;
    const title = isSupportRequest ? "Solicitação de suporte recebida" : "Novo chamado criado";
    const body = `Chamado: ${ticketTitle}`;

    await this.createMany(
      (profiles as Array<{ id: string }>).map((p) => ({ user_id: p.id, type, title, body, metadata: { ticket_id: ticketId } }))
    );
  }

  async notifyTicketStatusChange(
    creatorId: string,
    creatorEmail: string,
    creatorName: string,
    ticketTitle: string,
    ticketId: string,
    newStatus: string
  ): Promise<void> {
    const STATUS_LABELS: Record<string, string> = {
      open: "Aberto",
      in_progress: "Em andamento",
      waiting: "Aguardando",
      resolved: "Resolvido",
      closed: "Fechado",
    };

    const statusLabel = STATUS_LABELS[newStatus] ?? newStatus;
    const title = "Status do chamado atualizado";
    const body = `Seu chamado "${ticketTitle}" foi atualizado para: ${statusLabel}`;

    await this.create({
      user_id: creatorId,
      type: "ticket_status_changed",
      title,
      body,
      metadata: { ticket_id: ticketId, new_status: newStatus },
    });

    await this.sendEmail(
      creatorEmail,
      `[BSM] ${title}`,
      `<p>Olá ${creatorName},</p><p>${body}</p>`
    );
  }

  async notifyAdminsOfEquipment(
    companyId: string,
    equipmentName: string,
    equipmentId: string
  ): Promise<void> {
    const { data: admins } = await this.supabase
      .from("profiles")
      .select("id")
      .eq("company_id", companyId)
      .eq("role", "admin");

    if (!admins || admins.length === 0) return;

    await this.createMany(
      admins.map((a: { id: string }) => ({
        user_id: a.id,
        type: "equipment_created" as const,
        title: "Novo equipamento cadastrado",
        body: `Equipamento "${equipmentName}" foi adicionado ao sistema.`,
        metadata: { equipment_id: equipmentId },
      }))
    );
  }
}

export function createNotificationService(supabase: SupabaseClient) {
  return new NotificationService(supabase);
}
