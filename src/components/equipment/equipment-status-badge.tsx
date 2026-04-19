import { Badge } from "@/components/ui/badge";
import type { EquipmentStatus } from "@/types";

const statusConfig: Record<EquipmentStatus, { label: string; variant: "success" | "neutral" | "warning" | "error" | "info" }> = {
  active: { label: "Ativo", variant: "success" },
  inactive: { label: "Inativo", variant: "neutral" },
  under_maintenance: { label: "Em Manutenção", variant: "warning" },
  calibration: { label: "Calibração", variant: "info" },
  retired: { label: "Descartado", variant: "error" },
};

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  const config = statusConfig[status] ?? { label: status, variant: "neutral" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
