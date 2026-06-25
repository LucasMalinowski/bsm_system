"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  documentId: string;
}

export function UploadVersionButton({ documentId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/documents/${documentId}/versions`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erro ao enviar nova versão");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 transition-colors disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        {uploading ? "Enviando..." : "Nova Versão"}
      </button>
    </div>
  );
}
