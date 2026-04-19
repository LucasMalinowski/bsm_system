import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { forbidden, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/utils/format";
import Link from "next/link";
import { InviteDialog } from "@/components/users/invite-dialog";
import { Button } from "@/components/ui/button";
import { Search, UserPlus } from "lucide-react";

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
  if (user.role !== "super_admin") forbidden();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const search = sp.search ?? "";
  const companyFilter = sp.company_id ?? "";
  const limit = 25;

  const supabase = createSupabaseAdminClient();

  let dataQuery = supabase
    .from("profiles")
    .select("id,name,avatar_url,role,is_active,created_at,company_id, company:companies(id,name)");

  let countQuery = supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (search) {
    dataQuery = dataQuery.ilike("name", `%${search}%`);
    countQuery = countQuery.ilike("name", `%${search}%`);
  }
  if (companyFilter) {
    dataQuery = dataQuery.eq("company_id", companyFilter);
    countQuery = countQuery.eq("company_id", companyFilter);
  }

  const [{ data, error }, { count, error: countError }, { data: companies }] = await Promise.all([
    dataQuery.order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1),
    countQuery,
    supabase.from("companies").select("id,name").order("name"),
  ]);

  if (error) throw new Error(error.message);
  if (countError) throw new Error(countError.message);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 lg:p-7 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Usuários</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{total} usuários em todas as empresas</p>
        </div>
        <InviteDialog companies={companies ?? []} isSuperAdmin>
          <Button className="h-9 rounded-lg px-4 text-[13px] font-semibold">
            <UserPlus className="h-4 w-4" />
            Convidar Usuário
          </Button>
        </InviteDialog>
      </div>

      <form method="GET" className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Buscar usuário..."
            className="h-9 w-60 rounded-lg border border-gray-300 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-[var(--brand-primary)] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)]"
          />
        </div>
        <select
          name="company_id"
          defaultValue={companyFilter}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[var(--brand-primary)]"
        >
          <option value="">Todas as empresas</option>
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="h-9 rounded-lg bg-[var(--brand-primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90"
        >
          Filtrar
        </button>
      </form>

      <div
        className="bg-white border border-gray-200 rounded-xl overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Usuário</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Empresa</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Perfil</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Cadastrado</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                (data ?? []).map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} src={u.avatar_url} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{u.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{u.company?.name ?? "—"}</td>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
      </div>
    </div>
  );
}
