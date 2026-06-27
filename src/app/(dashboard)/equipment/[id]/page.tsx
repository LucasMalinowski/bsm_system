import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEquipmentService } from "@/lib/services/equipment.service";
import { can, isSuperAdmin, PERMISSIONS } from "@/lib/auth/permissions";
import { forbidden, redirect, notFound } from "next/navigation";
import { EquipmentDetailClient } from "@/components/equipment/equipment-detail-client";

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!can(user, PERMISSIONS.EQUIPMENT_READ)) forbidden();

  const supabase = await createSupabaseServerClient();
  const service = createEquipmentService(supabase);
  const equipment = await service.getWithHistory(id);

  if (!equipment) notFound();

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", equipment.company_id)
    .single();

  return (
    <EquipmentDetailClient
      equipment={equipment}
      canCreate={can(user, PERMISSIONS.TICKET_CREATE)}
      canUpdate={can(user, PERMISSIONS.EQUIPMENT_UPDATE)}
      isSuperAdmin={isSuperAdmin(user)}
      userRole={user.role}
      companyName={company?.name ?? ""}
    />
  );
}
