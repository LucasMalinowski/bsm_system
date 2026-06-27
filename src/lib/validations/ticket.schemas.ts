import { z } from "zod";
import { paginationSchema } from "./common.schemas";

const TICKET_STATUSES = ["open", "in_progress", "waiting", "resolved", "closed"] as const;
const TICKET_PRIORITIES = ["low", "medium", "high", "critical"] as const;

const TICKET_TYPES = ["maintenance", "calibration", "repair", "inspection", "other"] as const;

export const createTicketSchema = z.object({
  company_id: z.string().uuid().optional(),
  title: z.string().min(3, "Title is required").max(300),
  description: z.string().min(1, "Description is required").max(5000),
  priority: z.enum(TICKET_PRIORITIES).optional().default("medium"),
  type: z.enum(TICKET_TYPES).optional().default("maintenance"),
  equipment_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  is_support_request: z.boolean().optional().default(false),
});

export const updateTicketSchema = z.object({
  title: z.string().min(3).max(300).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  equipment_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  finalization_reason: z.string().max(100).optional(),
  finalization_notes: z.string().max(2000).optional(),
  budget_url: z.string().nullable().optional(),
});

export const ticketFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assigned_to: z.string().uuid().optional(),
  equipment_id: z.string().uuid().optional(),
  sort: z.enum(["created_at", "updated_at", "priority", "status"]).optional().default("updated_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(5000),
});

export type CreateTicketInput = z.input<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketFilterInput = z.infer<typeof ticketFilterSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
