"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ImpersonationBannerProps {
  companyName: string;
}

export function ImpersonationBanner({ companyName }: ImpersonationBannerProps) {
  const [loading, setLoading] = useState(false);

  const exit = async () => {
    setLoading(true);
    await fetch("/api/super-admin/impersonate/exit", { method: "POST" });
    window.location.href = "/super-admin/companies";
  };

  return (
    <div className="flex items-center justify-between bg-amber-500 px-4 py-2 text-sm font-medium text-white">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>
          Você está visualizando como <strong>{companyName}</strong>
        </span>
      </div>
      <button
        onClick={exit}
        disabled={loading}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-amber-600 transition-colors disabled:opacity-60"
      >
        <X className="h-3 w-3" />
        Sair da empresa
      </button>
    </div>
  );
}
