import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-session";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { NewEquipmentPageClient } from "@/components/equipment/new-equipment-page-client";

export default async function NewEquipmentPage() {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!can(user, PERMISSIONS.EQUIPMENT_CREATE)) redirect("/equipment");

  return <NewEquipmentPageClient companyId={user.company_id ?? undefined} />;
}
