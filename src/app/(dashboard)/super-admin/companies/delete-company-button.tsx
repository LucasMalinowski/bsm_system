"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteCompanyButtonProps {
  companyId: string;
  companyName: string;
}

export function DeleteCompanyButton({ companyId, companyName }: DeleteCompanyButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    const ok = window.confirm(
      `Excluir ${companyName}? Isso removerá a empresa e todos os dados relacionados de forma permanente.`
    );
    if (!ok) return;

    setLoading(true);
    setError(null);

    const res = await fetch(`/api/companies/${companyId}`, {
      method: "DELETE",
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(json?.error ?? "Erro ao excluir empresa");
      return;
    }

    router.push("/super-admin/companies");
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <Button variant="destructive" isLoading={loading} onClick={handleDelete}>
        <Trash2 className="h-4 w-4" />
        Excluir Empresa
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
