import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEquipmentService } from "@/lib/services/equipment.service";
import { equipmentFilterSchema } from "@/lib/validations/equipment.schemas";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { forbidden, redirect } from "next/navigation";
import { EquipmentListClient } from "@/components/equipment/equipment-list-client";

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!can(user, PERMISSIONS.EQUIPMENT_READ)) forbidden();
  if (!user.company_id) redirect("/super-admin/companies");

  const params = await searchParams;
  const filters = equipmentFilterSchema.parse(params);

  const supabase = await createSupabaseServerClient();
  const service = createEquipmentService(supabase);
  const result = await service.list(user.company_id, filters);

  return (
    <EquipmentListClient
      equipment={result.data as Parameters<typeof EquipmentListClient>[0]["equipment"]}
      total={result.pagination.total}
      totalPages={result.pagination.total_pages}
      page={result.pagination.page}
      canCreate={can(user, PERMISSIONS.EQUIPMENT_CREATE)}
      canDelete={can(user, PERMISSIONS.EQUIPMENT_DELETE)}
    />
  );
}
