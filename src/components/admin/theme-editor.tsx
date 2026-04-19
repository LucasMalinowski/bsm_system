"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CompanyTheme } from "@/types";

interface ThemeEditorProps {
  companyId: string;
  currentTheme: CompanyTheme;
}

export function ThemeEditor({ companyId, currentTheme }: ThemeEditorProps) {
  const [theme, setTheme] = useState(currentTheme);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (key: keyof CompanyTheme, value: string) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
    // Apply live preview
    if (key === "primary_color") {
      document.documentElement.style.setProperty("--brand-primary", value);
      document.documentElement.style.setProperty("--sidebar-bg", value);
    }
    if (key === "secondary_color") {
      document.documentElement.style.setProperty("--brand-secondary", value);
    }
    if (key === "accent_color") {
      document.documentElement.style.setProperty("--brand-accent", value);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    const res = await fetch(`/api/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primary_color: theme.primary_color,
        secondary_color: theme.secondary_color,
        accent_color: theme.accent_color,
        logo_url: theme.logo_url,
      }),
    });

    setIsSaving(false);
    setMessage(res.ok ? "Configurações salvas com sucesso!" : "Erro ao salvar.");
  };

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="flex gap-3 rounded-lg border border-gray-200 p-4">
        <div
          className="h-10 w-10 rounded-lg flex-shrink-0"
          style={{ background: theme.primary_color }}
          title="Cor primária"
        />
        <div
          className="h-10 w-10 rounded-lg flex-shrink-0"
          style={{ background: theme.secondary_color }}
          title="Cor secundária"
        />
        <div
          className="h-10 w-10 rounded-lg flex-shrink-0 border"
          style={{ background: theme.accent_color ?? "#e0f0fb" }}
          title="Cor de destaque"
        />
        <div className="text-sm text-gray-500 flex items-center">Pré-visualização das cores</div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Cor Primária</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={theme.primary_color}
              onChange={(e) => handleChange("primary_color", e.target.value)}
              className="h-10 w-12 cursor-pointer rounded border border-gray-300 p-0.5"
            />
            <Input
              value={theme.primary_color}
              onChange={(e) => handleChange("primary_color", e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Cor Secundária</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={theme.secondary_color}
              onChange={(e) => handleChange("secondary_color", e.target.value)}
              className="h-10 w-12 cursor-pointer rounded border border-gray-300 p-0.5"
            />
            <Input
              value={theme.secondary_color}
              onChange={(e) => handleChange("secondary_color", e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Cor de Destaque</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={theme.accent_color ?? "#e0f0fb"}
              onChange={(e) => handleChange("accent_color", e.target.value)}
              className="h-10 w-12 cursor-pointer rounded border border-gray-300 p-0.5"
            />
            <Input
              value={theme.accent_color ?? "#e0f0fb"}
              onChange={(e) => handleChange("accent_color", e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.includes("sucesso") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}

      <Button onClick={handleSave} isLoading={isSaving}>
        Salvar Configurações
      </Button>
    </div>
  );
}
