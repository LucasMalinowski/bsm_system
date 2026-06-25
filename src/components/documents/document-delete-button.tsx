"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  documentId: string;
  documentName: string;
}

export function DocumentDeleteButton({ documentId, documentName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erro ao excluir documento");
      }
      router.push("/documents");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <div className="space-y-2">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={() => setConfirming(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
          Excluir documento
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700">
        Tem certeza que deseja excluir <strong>{documentName}</strong>? Esta ação não pode ser desfeita.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Excluindo..." : "Confirmar exclusão"}
        </button>
      </div>
    </div>
  );
}
