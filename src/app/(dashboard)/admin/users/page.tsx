import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createUserService } from "@/lib/services/user.service";
import { createCompanyService } from "@/lib/services/company.service";
import { isAdmin } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/utils/format";
import Link from "next/link";
import { InviteDialog } from "@/components/users/invite-dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  employee: "Funcionário",
};

export default async function UsersPage() {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role === "super_admin") redirect("/super-admin/companies");
  if (!isAdmin(user)) redirect("/dashboard");
  if (!user.company_id) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const service = createUserService(supabase);
  const [users, company] = await Promise.all([
    service.listByCompany(user.company_id),
    createCompanyService(supabase).getById(user.company_id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <InviteDialog defaultCompanyId={user.company_id ?? undefined} defaultCompanyName={company?.name}>
          <Button>
            <UserPlus className="h-4 w-4" />
            Convidar Usuário
          </Button>
        </InviteDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membros da equipe ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Usuário</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Função</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Permissões</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Cadastrado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} src={u.avatar_url} size="sm" />
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === "admin" ? "info" : "neutral"}>
                      {roleLabels[u.role] ?? u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.permissions.length} permissões
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.is_active ? "success" : "error"}>
                      {u.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDateTime(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-sm text-[var(--brand-primary)] hover:underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
