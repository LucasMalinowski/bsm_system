"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { formatDateTime, formatFileSize } from "@/lib/utils/format";

interface Company { id: string; name: string }
interface DocumentRow {
  id: string;
  name: string;
  file_size?: number | null;
  version?: number | null;
  created_at: string;
  company?: { name: string } | null;
  uploader?: { name: string } | null;
}

interface Props {
  documents: DocumentRow[];
  companies: Company[];
  totalPages: number;
  page: number;
  search: string;
  total: number;
}

export function SADocumentsClient({ documents, companies, totalPages, page, search, total }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDocName, setDeleteDocName] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  // Upload state
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [uploadCompanyId, setUploadCompanyId] = useState<string>("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategoryId, setUploadCategoryId] = useState<string>("");
  const [uploadCategories, setUploadCategories] = useState<{ id: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteId(null);
        router.refresh();
      }
    } catch { /* ignore */ }
    setDeleting(false);
  };

  const handlePickCompany = async () => {
    if (!uploadCompanyId) return;
    setShowCompanyPicker(false);
    setUploadCategories([]);
    setUploadCategoryId("");
    try {
      const res = await fetch(`/api/document-categories?company_id=${uploadCompanyId}`);
      if (res.ok) {
        const { data } = await res.json();
        setUploadCategories(data ?? []);
      }
    } catch { /* ignore */ }
    setShowUploadForm(true);
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadCompanyId) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("name", uploadName || uploadFile.name);
      fd.append("company_id", uploadCompanyId);
      if (uploadCategoryId) fd.append("category_id", uploadCategoryId);

      const res = await fetch("/api/documents", { method: "POST", body: fd });
      if (res.ok) {
        setShowUploadForm(false);
        setUploadFile(null);
        setUploadName("");
        setUploadCompanyId("");
        router.refresh();
      } else {
        const { error } = await res.json().catch(() => ({ error: "Erro ao enviar" }));
        setUploadError(error ?? "Erro ao enviar documento");
      }
    } catch {
      setUploadError("Erro ao enviar documento");
    }
    setUploading(false);
  };

  return (
    <>
      {/* Header actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form method="GET" className="flex w-full gap-2 sm:w-auto">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              name="search"
              defaultValue={search}
              placeholder="Buscar documento..."
              className="h-9 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-[var(--brand-primary)] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] sm:w-60"
            />
          </div>
          <button type="submit" className="h-9 rounded-lg bg-[var(--brand-primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90">
            Buscar
          </button>
        </form>
        <button
          onClick={() => { setUploadCompanyId(companies[0]?.id ?? ""); setShowCompanyPicker(true); }}
          className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white flex items-center gap-1.5 flex-shrink-0"
          style={{ background: "var(--brand-primary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Documento
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
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
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Nenhum documento encontrado
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/70">
                    <td className="px-4 py-3 text-xs text-gray-500">{doc.company?.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900 truncate max-w-xs">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatFileSize(doc.file_size ?? 0)}</td>
                    <td className="px-4 py-3 text-gray-600">v{doc.version}</td>
                    <td className="px-4 py-3 text-gray-600">{doc.uploader?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDateTime(doc.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setDeleteId(doc.id); setDeleteDocName(doc.name); }}
                        className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors"
                      >
                        Excluir
                      </button>
                    </td>
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

      {/* Mobile cards */}
      <div className="lg:hidden flex flex-col gap-2">
        {documents.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            Nenhum documento encontrado
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-red-50 p-2 text-red-400 flex-shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{doc.name}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{doc.company?.name ?? "—"}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-gray-500">
                    <span>Tam.: {formatFileSize(doc.file_size ?? 0)}</span>
                    <span>v{doc.version}</span>
                    <span>{doc.uploader?.name ?? "—"}</span>
                    <span>{formatDateTime(doc.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setDeleteId(doc.id); setDeleteDocName(doc.name); }}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Company picker overlay */}
      {showCompanyPicker && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          onClick={() => setShowCompanyPicker(false)}
        >
          <div
            className="bg-white rounded-[20px] p-6 flex flex-col gap-4"
            style={{ width: 400, maxWidth: "calc(100vw - 32px)", boxShadow: "0 25px 60px rgba(0,0,0,0.20)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-bold text-gray-900">Selecionar Empresa</span>
              <button onClick={() => setShowCompanyPicker(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <p className="text-[13px] text-gray-500">Escolha a empresa para a qual deseja enviar o documento.</p>
            <select
              value={uploadCompanyId}
              onChange={(e) => setUploadCompanyId(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 outline-none focus:border-[#0363a9] bg-white"
            >
              <option value="">Selecionar empresa...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCompanyPicker(false)} className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                disabled={!uploadCompanyId}
                onClick={handlePickCompany}
                className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white transition-opacity"
                style={{ background: "var(--brand-primary)", opacity: uploadCompanyId ? 1 : 0.5, cursor: uploadCompanyId ? "pointer" : "not-allowed" }}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload form overlay */}
      {showUploadForm && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          onClick={() => !uploading && setShowUploadForm(false)}
        >
          <div
            className="bg-white rounded-[20px] p-6 flex flex-col gap-4"
            style={{ width: 480, maxWidth: "calc(100vw - 32px)", boxShadow: "0 25px 60px rgba(0,0,0,0.20)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-bold text-gray-900">Enviar Documento</span>
              <button onClick={() => !uploading && setShowUploadForm(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <p className="text-[13px] text-gray-500">
              Empresa: <strong>{companies.find((c) => c.id === uploadCompanyId)?.name}</strong>
            </p>

            {/* File selection */}
            <div>
              <label className="text-[12px] font-semibold text-gray-700 block mb-1.5">Arquivo</label>
              {uploadFile ? (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5">
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-[13px] text-gray-700 truncate flex-1">{uploadFile.name}</span>
                  <button type="button" onClick={() => { setUploadFile(null); setUploadName(""); }} className="text-[11px] text-red-500 hover:text-red-600 flex-shrink-0">Remover</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border border-dashed border-gray-300 text-[12px] text-gray-500 hover:border-[#0363a9] hover:text-[#0363a9] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Selecionar arquivo
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setUploadFile(f); setUploadName(f.name.replace(/\.[^.]+$/, "")); }
                }}
              />
            </div>

            {/* Name */}
            <div>
              <label className="text-[12px] font-semibold text-gray-700 block mb-1.5">Nome do documento</label>
              <input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Nome do documento"
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 outline-none focus:border-[#0363a9] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] transition-all"
              />
            </div>

            {/* Category */}
            {uploadCategories.length > 0 && (
              <div>
                <label className="text-[12px] font-semibold text-gray-700 block mb-1.5">Categoria</label>
                <select
                  value={uploadCategoryId}
                  onChange={(e) => setUploadCategoryId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 outline-none focus:border-[#0363a9] bg-white"
                >
                  <option value="">Sem categoria</option>
                  {uploadCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {uploadError && (
              <p className="text-[12px] text-red-600 font-medium">{uploadError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                disabled={uploading}
                onClick={() => setShowUploadForm(false)}
                className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={uploading || !uploadFile}
                onClick={handleUpload}
                className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white transition-opacity"
                style={{ background: "var(--brand-primary)", opacity: (!uploadFile || uploading) ? 0.5 : 1, cursor: (!uploadFile || uploading) ? "not-allowed" : "pointer" }}
              >
                {uploading ? "Enviando..." : "Enviar Documento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation overlay */}
      {deleteId && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          onClick={() => !deleting && setDeleteId(null)}
        >
          <div
            className="bg-white rounded-[20px] p-6 flex flex-col gap-4"
            style={{ width: 400, maxWidth: "calc(100vw - 32px)", boxShadow: "0 25px 60px rgba(0,0,0,0.20)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </div>
              <div>
                <p className="text-[15px] font-bold text-gray-900">Excluir Documento</p>
                <p className="text-[13px] text-gray-500 mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-[13px] text-gray-700">
              Tem certeza que deseja excluir o documento <strong>"{deleteDocName}"</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                disabled={deleting}
                onClick={() => setDeleteId(null)}
                className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                style={{ opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
