"use client";

import { useState, useEffect, useRef } from "react";
import type { CalibrationDocument } from "@/types";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

function formatSize(bytes: number) {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const PLACEHOLDERS = [
  { code: "{{nome_equipamento}}",  label: "Nome do equipamento",       example: "Balança Analítica XP205" },
  { code: "{{codigo_interno}}",    label: "Código interno",            example: "BAL-01" },
  { code: "{{nome_empresa}}",      label: "Nome da empresa",           example: "BrasaTech Ltda" },
  { code: "{{cnpj_empresa}}",      label: "CNPJ da empresa",           example: "12.345.678/0001-90" },
  { code: "{{data_calibracao}}",   label: "Data da calibração",        example: "2026-05-22" },
  { code: "{{periodicidade}}",     label: "Periodicidade",             example: "anual" },
  { code: "{{marca}}",             label: "Marca / fabricante",        example: "Shimadzu" },
  { code: "{{modelo}}",            label: "Modelo",                    example: "AUW220" },
  { code: "{{numero_serie}}",      label: "Número de série",           example: "SHZ-2025-00001" },
  { code: "{{tag}}",               label: "Tag",                       example: "TAG-001" },
  { code: "{{escala}}",            label: "Escala",                    example: "0-220g" },
  { code: "{{ponto_N_valor}}",     label: "Valor do ponto N (ex: N=1)", example: "100,000 g" },
  { code: "{{ponto_N_criterio}}", label: "Critério do ponto N",       example: "OIML M1" },
  { code: "{{ponto_N_erro}}",      label: "Tolerância do ponto N",     example: "0.5" },
];

function PlaceholderGuide() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#e0f0fb" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0363a9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div>
          <p className="text-[14px] font-bold text-gray-900">Como usar variáveis no template</p>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Adicione os códigos abaixo em qualquer célula do seu XLSX. Ao registrar uma calibração, o sistema substitui automaticamente cada código pelo valor real do equipamento.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Passo a passo</p>
        <div className="flex flex-col gap-2.5">
          {[
            { n: "1", text: "Abra ou crie seu arquivo XLSX no Excel ou LibreOffice" },
            { n: "2", text: "Digite um código de variável (ex: {{nome_equipamento}}) em qualquer célula onde queira o valor preenchido automaticamente" },
            { n: "3", text: "Salve o arquivo e faça o upload aqui como Novo Template" },
            { n: "4", text: "Ao registrar uma calibração, o sistema gera uma cópia do template com todos os códigos substituídos pelos dados reais" },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold text-white" style={{ background: "#0363a9" }}>{n}</div>
              <p className="text-[12px] text-gray-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder table */}
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Variáveis disponíveis</p>
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left font-semibold text-gray-500 text-[11px] uppercase tracking-wide">Código para usar no XLSX</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500 text-[11px] uppercase tracking-wide hidden sm:table-cell">Descrição</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500 text-[11px] uppercase tracking-wide hidden md:table-cell">Exemplo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PLACEHOLDERS.map(({ code, label, example }) => (
                <tr key={code} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <code className="text-[11px] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-blue-800 font-mono select-all">{code}</code>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 hidden sm:table-cell">{label}</td>
                  <td className="px-3 py-2.5 text-gray-400 font-mono text-[11px] hidden md:table-cell">{example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            <strong>Para pontos de calibração</strong>, substitua <code className="font-mono bg-amber-100 px-1 rounded">N</code> pelo número do ponto (1, 2, 3…).
            Exemplo: <code className="font-mono bg-amber-100 px-1 rounded">{"{{ponto_1_valor}}"}</code>, <code className="font-mono bg-amber-100 px-1 rounded">{"{{ponto_2_criterio}}"}</code>.
            Os pontos são preenchidos na mesma ordem em que foram cadastrados no equipamento.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CalibrationDocumentsPage() {
  const [docs, setDocs] = useState<CalibrationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadDocId, setUploadDocId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchDocs = async () => {
    const res = await fetch("/api/calibration-documents");
    const { data } = await res.json();
    setDocs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  return (
    <div className="p-4 lg:p-7 flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Documentos de Calibração</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Templates XLSX usados como base para registros de calibração</p>
        </div>
        <button
          onClick={() => { setShowUpload(true); setUploadDocId(null); }}
          className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white flex items-center gap-2 flex-shrink-0"
          style={{ background: "var(--brand-primary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo Template
        </button>
      </div>

      {/* How-to guide — always visible */}
      <PlaceholderGuide />

      {/* Template list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-[13px]">Carregando...</div>
        ) : docs.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="mx-auto mb-3 text-gray-300" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p className="text-[13px] text-gray-400 mb-1">Nenhum template cadastrado</p>
            <p className="text-[12px] text-gray-400">Clique em "Novo Template" para fazer o upload do seu primeiro XLSX</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {docs.map((doc) => (
              <div key={doc.id}>
                <div className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#e0f0fb" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0363a9" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-gray-900">{doc.name}</div>
                      <div className="text-[12px] text-gray-400">
                        v{doc.current_version} · Criado em {formatDate(doc.created_at)} por {doc.creator?.name ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                      className="h-8 px-3 rounded-lg text-[12px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-100"
                    >
                      {expandedId === doc.id ? "Fechar" : `Versões (${doc.versions?.length ?? 1})`}
                    </button>
                    <a
                      href={`/api/calibration-documents/${doc.id}/download`}
                      className="h-8 px-3 rounded-lg text-[12px] font-medium text-[#0363a9] border border-[#0363a9]/30 hover:bg-[#0363a9]/5"
                    >
                      Download
                    </a>
                    <button
                      onClick={() => { setUploadDocId(doc.id); setShowUpload(true); }}
                      className="h-8 px-3 rounded-lg text-[12px] font-semibold text-white"
                      style={{ background: "var(--brand-primary)" }}
                    >
                      Nova Versão
                    </button>
                  </div>
                </div>

                {expandedId === doc.id && (
                  <div className="bg-gray-50 px-5 pb-4 pt-1">
                    {doc.description && (
                      <p className="text-[12px] text-gray-500 mb-3 pt-2">{doc.description}</p>
                    )}
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Histórico de versões</div>
                    <div className="flex flex-col gap-1.5">
                      {(doc.versions ?? []).sort((a, b) => b.version - a.version).map((v) => (
                        <div key={v.id} className="flex items-center justify-between text-[12px] text-gray-700 bg-white rounded-lg px-3 py-2 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-[11px] bg-gray-100 px-1.5 py-0.5 rounded">v{v.version}</span>
                            <span className="text-gray-500">{formatDate(v.created_at)} · {v.uploader?.name}</span>
                            {v.notes && <span className="text-gray-400 italic">"{v.notes}"</span>}
                          </div>
                          <span className="text-gray-400">{formatSize(v.file_size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          docId={uploadDocId}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); fetchDocs(); }}
        />
      )}
    </div>
  );
}

function UploadModal({ docId, onClose, onSuccess }: { docId: string | null; onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isNewDoc = !docId;

  const handleSubmit = async () => {
    if (!file) { setError("Selecione um arquivo XLSX"); return; }
    if (isNewDoc && !name.trim()) { setError("Digite um nome para o template"); return; }

    setLoading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      if (isNewDoc) {
        fd.append("name", name);
        fd.append("description", description);
      } else {
        fd.append("notes", notes);
      }

      const url = isNewDoc
        ? "/api/calibration-documents"
        : `/api/calibration-documents/${docId}/versions`;

      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? "Erro ao fazer upload");
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}>
      <div className="bg-white rounded-[20px] overflow-hidden flex flex-col w-[520px] max-w-[calc(100vw-32px)] max-h-[90vh]" style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 flex-shrink-0">
          <span className="text-[16px] font-bold text-gray-900">
            {isNewDoc ? "Novo Template de Calibração" : "Nova Versão"}
          </span>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-6 py-5">
          {isNewDoc && (
            <>
              <div>
                <label className="text-[13px] font-semibold text-gray-700 block mb-1.5">Nome do template *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Planilha de Calibração Balança"
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] outline-none focus:border-[#0363a9] transition-all"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-700 block mb-1.5">Descrição (opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Ex: Template para balanças analíticas, inclui cálculo de incerteza"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[13px] outline-none resize-none focus:border-[#0363a9] transition-all"
                />
              </div>
            </>
          )}

          {!isNewDoc && (
            <div>
              <label className="text-[13px] font-semibold text-gray-700 block mb-1.5">Notas sobre esta versão</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Corrigido formato das colunas de erro"
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] outline-none focus:border-[#0363a9] transition-all"
              />
            </div>
          )}

          <div>
            <label className="text-[13px] font-semibold text-gray-700 block mb-1.5">Arquivo XLSX *</label>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1.5 hover:border-[#0363a9] hover:bg-blue-50 transition-all"
            >
              {file ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span className="text-[12px] font-medium text-green-700">{file.name}</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span className="text-[12px] text-gray-400">Clique para selecionar o arquivo .xlsx</span>
                </>
              )}
            </button>
          </div>

          {/* Quick reference inside the modal */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
            <p className="text-[11px] font-semibold text-blue-700 mb-2">Variáveis que você pode usar no XLSX</p>
            <div className="flex flex-wrap gap-1">
              {PLACEHOLDERS.map(({ code, label }) => (
                <span key={code} className="flex items-center gap-1 rounded-full bg-white border border-blue-200 pl-1.5 pr-2 py-0.5">
                  <code className="text-[10px] font-mono text-blue-800">{code}</code>
                  <span className="text-[10px] text-gray-400">→ {label}</span>
                </span>
              ))}
            </div>
          </div>

          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>

        <div className="flex gap-2.5 justify-end px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white"
            style={{ background: "var(--brand-primary)", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Enviando..." : isNewDoc ? "Criar Template" : "Salvar Versão"}
          </button>
        </div>
      </div>
    </div>
  );
}
