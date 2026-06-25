import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { forbidden, redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleManager } from "@/components/admin/role-manager";
import { UserEditCard } from "@/components/admin/user-edit-card";
import { Avatar } from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createUserService } from "@/lib/services/user.service";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  employee: "Funcionário",
};

export default async function SAUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") forbidden();

  const supabase = createSupabaseAdminClient();

  const [{ data: profile }, permissions] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,name,avatar_url,role,is_active,company_id, company:companies(name)")
      .eq("id", id)
      .single(),
    createUserService(supabase).getPermissions(id),
  ]);

  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 lg:p-7">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/users" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <Avatar name={(profile as any).name} src={(profile as any).avatar_url} size="md" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{(profile as any).name}</h1>
            <p className="text-sm text-gray-500">
              {roleLabels[(profile as any).role] ?? (profile as any).role}
              {(profile as any).company?.name ? ` — ${(profile as any).company.name}` : ""}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <UserEditCard
            userId={id}
            initialName={(profile as any).name}
            initialRole={(profile as any).role}
            initialAvatarUrl={(profile as any).avatar_url}
            initialIsActive={(profile as any).is_active ?? true}
            isSelf={id === user.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          <RoleManager userId={id} currentPermissions={permissions} userRole={(profile as any).role} />
        </CardContent>
      </Card>
    </div>
  );
}
