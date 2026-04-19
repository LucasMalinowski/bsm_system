import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createUserService } from "@/lib/services/user.service";
import { isAdmin } from "@/lib/auth/permissions";
import { forbidden, redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleManager } from "@/components/admin/role-manager";
import { Avatar } from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!isAdmin(user)) forbidden();

  const supabase = await createSupabaseServerClient();
  const service = createUserService(supabase);
  const permissions = await service.getPermissions(id);

  // Get profile from profiles list
  const users = await service.listByCompany(user.company_id!);
  const profile = users.find((u) => u.id === id);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <Avatar name={profile.name} src={profile.avatar_url} size="md" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
            <p className="text-sm text-gray-500">{profile.role}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          <RoleManager userId={id} currentPermissions={permissions} userRole={profile.role} />
        </CardContent>
      </Card>
    </div>
  );
}
