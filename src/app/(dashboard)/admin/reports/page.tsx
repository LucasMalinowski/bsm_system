import { getServerSession } from "@/lib/auth/get-session";
import { isAdmin, isSuperAdmin } from "@/lib/auth/permissions";
import { forbidden, redirect } from "next/navigation";
import { ReportsClient } from "@/components/reports/reports-client";

export default async function AdminReportsPage() {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!isAdmin(user) && !isSuperAdmin(user)) forbidden();

  return <ReportsClient companyId={user.company_id ?? undefined} isSuperAdmin={false} />;
}
