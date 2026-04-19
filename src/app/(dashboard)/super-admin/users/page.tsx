import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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

export default async function SAUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; company_id?: string }>;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") redirect("/dashboard");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const search = sp.search ?? "";
  const companyFilter = sp.company_id ?? "";
  const limit = 50;

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("profiles")
    .select("*, company:companies(id,name)", { count: "exact" });

  if (search) query = query.ilike("name", `%${search}%`);
  if (companyFilter) query = query.eq("company_id", companyFilter);

  const [{ data, count, error }, { data: companies }] = await Promise.all([
    query.order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1),
    supabase.from("companies").select("id,name").order("name"),
  ]);

  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários — Global</h1>
          <p className="text-sm text-gray-500">{total} usuários em todas as empresas</p>
        </div>
        <InviteDialog companies={companies ?? []} isSuperAdmin>
          <Button>
            <UserPlus className="h-4 w-4" />
            Convidar Usuário
          </Button>
        </InviteDialog>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="search"
          defaultValue={search}
          placeholder="Buscar usuário..."
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <select
          name="company_id"
          defaultValue={companyFilter}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none"
        >
          <option value="">Todas as empresas</option>
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800">
          Filtrar
        </button>
      </form>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Usuário</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Empresa</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Função</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Cadastrado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                (data ?? []).map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} src={u.avatar_url} size="sm" />
                        <span className="font-medium text-gray-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.company?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === "admin" ? "info" : u.role === "super_admin" ? "warning" : "neutral"}>
                        {roleLabels[u.role] ?? u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.is_active ? "success" : "error"}>
                        {u.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDateTime(u.created_at)}</td>
                    <td className="px-4 py-3">
                      {u.company_id && (
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="text-sm text-[var(--brand-primary)] hover:underline"
                        >
                          Editar
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
              <span>Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`?page=${page - 1}&search=${search}&company_id=${companyFilter}`} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Anterior</Link>
                )}
                {page < totalPages && (
                  <Link href={`?page=${page + 1}&search=${search}&company_id=${companyFilter}`} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Próxima</Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
