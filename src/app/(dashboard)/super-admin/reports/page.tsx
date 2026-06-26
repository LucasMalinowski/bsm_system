import { getServerSession } from "@/lib/auth/get-session";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { forbidden, redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ReportsClient } from "@/components/reports/reports-client";

export default async function SuperAdminReportsPage() {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!isSuperAdmin(user)) forbidden();

  const admin = createSupabaseAdminClient();
  const { data: companies } = await admin.from("companies").select("id,name").order("name");

  return (
    <ReportsClient
      isSuperAdmin={true}
      companies={(companies ?? []) as { id: string; name: string }[]}
    />
  );
}
