export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface Ticket {
  id: string;
  company_id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  equipment_id: string | null;
  created_by: string;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  equipment?: { id: string; name: string; internal_code: string };
  creator?: { name: string };
  assignee?: { name: string; avatar_url: string | null };
  _count?: { comments: number };
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  user?: { name: string; avatar_url: string | null };
}

export interface CreateTicketDTO {
  title: string;
  description: string;
  priority?: TicketPriority;
  equipment_id?: string | null;
  assigned_to?: string | null;
}

export interface UpdateTicketDTO {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  equipment_id?: string | null;
  assigned_to?: string | null;
}

export interface CreateCommentDTO {
  body: string;
}
