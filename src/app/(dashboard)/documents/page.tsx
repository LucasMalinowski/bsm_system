import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDocumentService } from "@/lib/services/document.service";
import { documentFilterSchema } from "@/lib/validations/document.schemas";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatFileSize } from "@/lib/utils/format";
import Link from "next/link";
import { FileText, Download } from "lucide-react";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!can(user, PERMISSIONS.DOCUMENT_READ)) redirect("/dashboard");
  if (!user.company_id) redirect("/super-admin/companies");

  const params = await searchParams;
  const filters = documentFilterSchema.parse(params);

  const supabase = await createSupabaseServerClient();
  const service = createDocumentService(supabase);
  const result = await service.list(user.company_id, filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-sm text-gray-500">{result.pagination.total} documentos</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Equipamento</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tamanho</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Versão</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Enviado por</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {result.data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Nenhum documento encontrado
                  </td>
                </tr>
              ) : (
                result.data.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <Link
                          href={`/documents/${doc.id}`}
                          className="font-medium text-[var(--brand-primary)] hover:underline"
                        >
                          {doc.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{doc.category?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{doc.equipment?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{formatFileSize(doc.file_size)}</td>
                    <td className="px-4 py-3 text-gray-600">v{doc.version}</td>
                    <td className="px-4 py-3 text-gray-600">{doc.uploader?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDateTime(doc.created_at)}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="text-gray-400 hover:text-[var(--brand-primary)]"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
