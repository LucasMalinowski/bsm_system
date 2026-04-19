"use client";

import { useState, useRef } from "react";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogoUploadProps {
  companyId: string;
  currentLogoUrl: string | null;
}

export function LogoUpload({ companyId, currentLogoUrl }: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setSuccess(false);
    setError(null);
    upload(file);
  };

  const upload = async (file: File) => {
    setLoading(true);
    const formData = new FormData();
    formData.set("logo", file);

    const res = await fetch(`/api/companies/${companyId}/logo`, {
      method: "POST",
      body: formData,
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Erro ao fazer upload do logo.");
      setPreview(currentLogoUrl);
      return;
    }

    setPreview(json.data.logo_url);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="relative h-20 w-20 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50">
          {preview ? (
            <img src={preview} alt="Logo" className="h-full w-full object-contain p-1" />
          ) : (
            <Upload className="h-6 w-6 text-gray-300" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            isLoading={loading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {preview ? "Trocar Logo" : "Enviar Logo"}
          </Button>
          {preview && (
            <button
              onClick={() => setPreview(null)}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
              Remover
            </button>
          )}
          <p className="text-xs text-gray-400">PNG, JPG ou WebP. Máx. 2 MB.</p>
        </div>
      </div>

      {success && (
        <p className="text-sm text-green-600">Logo atualizado com sucesso.</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
