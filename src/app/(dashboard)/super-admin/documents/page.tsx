import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { forbidden, redirect } from "next/navigation";
import { formatDateTime, formatFileSize } from "@/lib/utils/format";
import Link from "next/link";
import { FileText, Search } from "lucide-react";

export default async function SADocumentsPage({
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
    .from("documents")
    .select(
      "id,name,file_size,version,created_at, company:companies(name), uploader:profiles!documents_uploaded_by_fkey(name)"
    );

  let countQuery = supabase
    .from("documents")
    .select("id", { count: "exact", head: true });

  if (search) {
    dataQuery = dataQuery.ilike("name", `%${search}%`);
    countQuery = countQuery.ilike("name", `%${search}%`);
  }

  const [
    { data, error },
    { count, error: countError },
  ] = await Promise.all([
    dataQuery.order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1),
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
          <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Documentos</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{total} documentos em todas as empresas</p>
        </div>
        <form method="GET" className="flex w-full gap-2 sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Buscar documento..."
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

      <div
        className="hidden lg:block bg-white border border-gray-200 rounded-xl overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Empresa</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Nome</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Tamanho</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Versão</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Enviado por</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Data</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    Nenhum documento encontrado
                  </td>
                </tr>
              ) : (
                (data ?? []).map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/70">
                    <td className="px-4 py-3 text-xs text-gray-500">{doc.company?.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900 truncate max-w-xs">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatFileSize(doc.file_size)}</td>
                    <td className="px-4 py-3 text-gray-600">v{doc.version}</td>
                    <td className="px-4 py-3 text-gray-600">{doc.uploader?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDateTime(doc.created_at)}</td>
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
            Nenhum documento encontrado
          </div>
        ) : (
          (data ?? []).map((doc) => (
            <div
              key={doc.id}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-red-50 p-2 text-red-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{doc.name}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{doc.company?.name ?? "—"}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-gray-500">
                    <span>Tam.: {formatFileSize(doc.file_size)}</span>
                    <span>v{doc.version}</span>
                    <span>{doc.uploader?.name ?? "—"}</span>
                    <span>{formatDateTime(doc.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
