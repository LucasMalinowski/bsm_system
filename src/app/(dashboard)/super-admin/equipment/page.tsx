import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EquipmentStatusBadge } from "@/components/equipment/equipment-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";
import Link from "next/link";

export default async function SAEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") redirect("/dashboard");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const search = sp.search ?? "";
  const limit = 50;

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("equipment")
    .select("*, category:equipment_categories(name), company:companies(id,name)", { count: "exact" });

  if (search) {
    query = query.or(`name.ilike.%${search}%,internal_code.ilike.%${search}%`);
  }

  const { data, count, error } = await query
    .order("updated_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipamentos — Global</h1>
          <p className="text-sm text-gray-500">{total} equipamentos em todas as empresas</p>
        </div>
        <form method="GET" className="flex gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Buscar equipamento..."
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
          >
            Buscar
          </button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Empresa</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Código</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Localização</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Próx. Calibração</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Nenhum equipamento encontrado
                  </td>
                </tr>
              ) : (
                (data ?? []).map((eq) => (
                  <tr key={eq.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">{eq.company?.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{eq.internal_code}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{eq.name}</span>
                      {eq.brand && <p className="text-xs text-gray-400">{eq.brand} {eq.model}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{eq.category?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <EquipmentStatusBadge status={eq.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{eq.location ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(eq.next_calibration)}</td>
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
                  <Link href={`?page=${page - 1}&search=${search}`} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Anterior</Link>
                )}
                {page < totalPages && (
                  <Link href={`?page=${page + 1}&search=${search}`} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Próxima</Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
