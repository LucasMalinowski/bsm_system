export type NotificationType =
  | "ticket_created"
  | "ticket_status_changed"
  | "ticket_assigned"
  | "ticket_support_request"
  | "equipment_created"
  | "calibration_due";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface CreateNotificationDTO {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}
