import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDocumentService } from "@/lib/services/document.service";
import { documentFilterSchema } from "@/lib/validations/document.schemas";
import { can, isSuperAdmin, PERMISSIONS } from "@/lib/auth/permissions";
import { forbidden, redirect } from "next/navigation";
import { formatFileSize, formatDate } from "@/lib/utils/format";
import { DocumentRowActions } from "@/components/documents/document-row-actions";
import Link from "next/link";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!can(user, PERMISSIONS.DOCUMENT_READ)) forbidden();
  if (!user.company_id) redirect("/super-admin/companies");

  const params = await searchParams;
  const filters = documentFilterSchema.parse(params);

  const supabase = await createSupabaseServerClient();
  const service = createDocumentService(supabase);
  const result = await service.list(user.company_id, filters, user.role === "employee");

  return (
    <div className="p-4 lg:p-7 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Documentos</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{result.pagination.total} documento{result.pagination.total !== 1 ? "s" : ""} cadastrado{result.pagination.total !== 1 ? "s" : ""}</p>
        </div>
        {isSuperAdmin(user) && (
          <button
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--brand-primary)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Anexar Documento
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Nome", "Equipamento", "Tamanho", "Versão", "Enviado por", "Data", ""].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.data.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Nenhum documento encontrado</td></tr>
            ) : (result.data as Array<{
              id: string; name: string; file_size: number; version: number;
              created_at: string; category?: { name: string } | null;
              equipment?: { id: string; name: string } | null;
              uploader?: { name: string } | null;
            }>).map((doc) => (
              <tr key={doc.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                    <div>
                      <Link href={`/documents/${doc.id}`} className="font-semibold text-[var(--brand-primary)] hover:underline">{doc.name}</Link>
                      {doc.category && <div className="text-[11px] text-gray-400 mt-0.5">{doc.category.name}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 text-[12px]">
                  {doc.equipment ? (
                    <Link href={`/equipment/${doc.equipment.id}`} className="hover:underline">{doc.equipment.name}</Link>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-[12px]">{formatFileSize(doc.file_size)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" style={{ background: "#e0f0fb", color: "#0363a9" }}>
                    v{doc.version}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {doc.uploader ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {initials(doc.uploader.name)}
                      </div>
                      <span className="text-[12px] text-gray-600">{doc.uploader.name}</span>
                    </div>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-[12px] text-gray-400">{formatDate(doc.created_at)}</td>
                <td className="px-4 py-3">
                  {isSuperAdmin(user) ? (
                    <DocumentRowActions documentId={doc.id} downloadHref={`/api/documents/${doc.id}/download`} />
                  ) : (
                    <a href={`/api/documents/${doc.id}/download`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--brand-primary)] transition-colors p-1 block" title="Visualizar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="lg:hidden flex flex-col gap-2.5">
        {result.data.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-[13px]">Nenhum documento encontrado</div>
        ) : (result.data as Array<{
          id: string; name: string; file_size: number; version: number;
          created_at: string; category?: { name: string } | null;
          equipment?: { id: string; name: string } | null;
        }>).map((doc) => (
          <Link key={doc.id} href={`/documents/${doc.id}`}>
            <div className="bg-white border border-gray-200 rounded-[14px] p-3.5 flex items-center gap-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="w-10 h-10 rounded-[10px] bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-gray-900 truncate">{doc.name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{doc.category?.name ?? "—"} · {formatFileSize(doc.file_size)}</div>
              </div>
              <span className="text-[11px] font-semibold px-2 py-[3px] rounded-full flex-shrink-0" style={{ background: "#e0f0fb", color: "#0363a9" }}>v{doc.version}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
