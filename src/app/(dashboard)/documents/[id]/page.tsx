import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDocumentService } from "@/lib/services/document.service";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { forbidden, redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatFileSize } from "@/lib/utils/format";
import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!can(user, PERMISSIONS.DOCUMENT_READ)) forbidden();

  const supabase = await createSupabaseServerClient();
  const service = createDocumentService(supabase);
  const doc = await service.getById(id);

  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/documents" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <FileText className="h-6 w-6 text-gray-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{doc.name}</h1>
            {doc.description && <p className="text-sm text-gray-500">{doc.description}</p>}
          </div>
        </div>
        <a href={`/api/documents/${id}/download`} className="flex items-center gap-2 text-sm text-[var(--brand-primary)] hover:underline">
          <Download className="h-4 w-4" />
          Download
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {[
              ["Categoria", doc.category?.name ?? "—"],
              ["Equipamento", doc.equipment?.name ?? "—"],
              ["Tamanho", formatFileSize(doc.file_size)],
              ["Tipo", doc.mime_type],
              ["Versão", `v${doc.version}`],
              ["Enviado por", doc.uploader?.name ?? "—"],
              ["Data de upload", formatDateTime(doc.created_at)],
              ["Última atualização", formatDateTime(doc.updated_at)],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="font-medium text-gray-500">{label}</dt>
                <dd className="mt-1 text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {doc.versions && doc.versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Versões</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {doc.versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">v{v.version}</p>
                    {v.notes && <p className="text-xs text-gray-500">{v.notes}</p>}
                    <p className="text-xs text-gray-400">
                      {v.uploader?.name} · {formatDateTime(v.created_at)} · {formatFileSize(v.file_size)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
