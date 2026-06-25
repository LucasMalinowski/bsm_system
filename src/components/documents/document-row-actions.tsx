"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  documentId: string;
  downloadHref: string;
}

export function DocumentRowActions({ documentId, downloadHref }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      if (res.ok) {
        setConfirming(false);
        router.refresh();
      }
    } catch {/* ignore */}
    setDeleting(false);
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-1 whitespace-nowrap">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-[11px] text-red-600 font-semibold hover:underline disabled:opacity-50"
        >
          {deleting ? "..." : "Confirmar"}
        </button>
        <button onClick={() => setConfirming(false)} className="text-[11px] text-gray-400 hover:underline">Cancelar</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <a href={downloadHref} className="text-gray-400 hover:text-[var(--brand-primary)] transition-colors p-1 block" title="Download">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </a>
      <button
        onClick={() => setConfirming(true)}
        className="text-gray-400 hover:text-red-500 transition-colors p-1"
        title="Excluir"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>
  );
}
