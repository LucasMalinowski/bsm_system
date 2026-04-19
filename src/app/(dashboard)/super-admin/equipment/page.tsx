import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { forbidden, redirect } from "next/navigation";
import { EquipmentStatusBadge } from "@/components/equipment/equipment-status-badge";
import { formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { Search } from "lucide-react";

export default async function SAEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") forbidden();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const search = sp.search ?? "";
  const limit = 25;

  const supabase = createSupabaseAdminClient();

  let dataQuery = supabase
    .from("equipment")
    .select(
      "id,internal_code,name,brand,model,status,location,next_calibration, category:equipment_categories(name), company:companies(id,name)"
    );

  let countQuery = supabase
    .from("equipment")
    .select("id", { count: "exact", head: true });

  if (search) {
    const filter = `name.ilike.%${search}%,internal_code.ilike.%${search}%`;
    dataQuery = dataQuery.or(filter);
    countQuery = countQuery.or(filter);
  }

  const [
    { data, error },
    { count, error: countError },
  ] = await Promise.all([
    dataQuery.order("updated_at", { ascending: false }).range((page - 1) * limit, page * limit - 1),
    countQuery,
  ]);

  if (error) throw new Error(error.message);
  if (countError) throw new Error(countError.message);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 lg:p-7 flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Equipamentos</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{total} equipamentos em todas as empresas</p>
        </div>
        <form method="GET" className="flex w-full gap-2 sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Buscar equipamento..."
              className="h-9 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-[var(--brand-primary)] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] sm:w-60"
            />
          </div>
          <button
            type="submit"
            className="h-9 rounded-lg bg-[var(--brand-primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90"
          >
            Buscar
          </button>
        </form>
      </div>

      <div className="hidden lg:block bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Empresa</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Código</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Equipamento</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Categoria</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Localização</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Próx. calibração</th>
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
      </div>

      <div className="lg:hidden flex flex-col gap-2">
        {(data ?? []).length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            Nenhum equipamento encontrado
          </div>
        ) : (
          (data ?? []).map((eq) => (
            <div
              key={eq.id}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{eq.name}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{eq.company?.name ?? "—"}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-gray-500">{eq.internal_code}</p>
                </div>
                <EquipmentStatusBadge status={eq.status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-gray-500">
                <div>
                  <span className="font-medium text-gray-700">Categoria:</span> {eq.category?.name ?? "—"}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Local:</span> {eq.location ?? "—"}
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-gray-700">Próx. calibração:</span> {formatDate(eq.next_calibration)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
