import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatFileSize } from "@/lib/utils/format";
import Link from "next/link";
import { FileText } from "lucide-react";

export default async function SADocumentsPage({
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
    .from("documents")
    .select("*, company:companies(name), uploader:profiles!documents_uploaded_by_fkey(name)", { count: "exact" });

  if (search) query = query.ilike("name", `%${search}%`);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos — Global</h1>
          <p className="text-sm text-gray-500">{total} documentos em todas as empresas</p>
        </div>
        <form method="GET" className="flex gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Buscar documento..."
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <button type="submit" className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800">
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
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tamanho</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Versão</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Enviado por</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
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
                  <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50">
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
