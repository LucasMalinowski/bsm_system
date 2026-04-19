import { Badge } from "@/components/ui/badge";
import type { TicketStatus, TicketPriority } from "@/types";

const statusConfig: Record<TicketStatus, { label: string; variant: "success" | "neutral" | "warning" | "error" | "info" }> = {
  open: { label: "Aberto", variant: "info" },
  in_progress: { label: "Em Andamento", variant: "warning" },
  waiting: { label: "Aguardando", variant: "neutral" },
  resolved: { label: "Resolvido", variant: "success" },
  closed: { label: "Fechado", variant: "neutral" },
};

const priorityConfig: Record<TicketPriority, { label: string; variant: "success" | "neutral" | "warning" | "error" | "info" }> = {
  low: { label: "Baixa", variant: "neutral" },
  medium: { label: "Média", variant: "info" },
  high: { label: "Alta", variant: "warning" },
  critical: { label: "Crítica", variant: "error" },
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const config = statusConfig[status] ?? { label: status, variant: "neutral" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const config = priorityConfig[priority] ?? { label: priority, variant: "neutral" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
