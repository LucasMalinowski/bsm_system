"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PERMISSIONS, PERMISSION_GROUPS, DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/auth/permissions";
import type { Permission, UserRole } from "@/types";

interface Props {
  userId: string;
  currentPermissions: Permission[];
  userRole: UserRole;
}

const COLUMN_LABELS = ["Visualizar", "Criar", "Editar", "Excluir", "Comentar"];
const MAX_COLS = COLUMN_LABELS.length;

export function RoleManager({ userId, currentPermissions, userRole }: Props) {
  const router = useRouter();
  const roleDefaults = new Set<Permission>(DEFAULT_PERMISSIONS_BY_ROLE[userRole] ?? []);
  const [selected, setSelected] = useState<Set<Permission>>(new Set(currentPermissions));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggle = (permission: Permission | null) => {
    if (!permission) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(permission) ? next.delete(permission) : next.add(permission);
      return next;
    });
  };

  const resetToDefaults = () => {
    setSelected(new Set(roleDefaults));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/users/${userId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: Array.from(selected) }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Permissões salvas!");
      router.refresh();
    } else {
      setMessage("Erro ao salvar.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-gray-200 overflow-hidden text-[13px]">
        {/* Header */}
        <div className="grid bg-gray-50 border-b border-gray-200 px-4 py-2.5" style={{ gridTemplateColumns: `1fr repeat(${MAX_COLS}, 80px)` }}>
          <span className="font-semibold text-gray-500 text-[11px] uppercase tracking-wide">Módulo</span>
          {COLUMN_LABELS.map((col) => (
            <span key={col} className="font-semibold text-gray-500 text-[11px] uppercase tracking-wide text-center">{col}</span>
          ))}
        </div>

        {/* Rows */}
        {PERMISSION_GROUPS.map((group, gi) => {
          const perms = [...group.permissions] as Array<Permission | null>;
          while (perms.length < MAX_COLS) perms.push(null);
          return (
            <div
              key={group.label}
              className="grid px-4 py-3 items-center"
              style={{
                gridTemplateColumns: "1fr repeat(4, 80px)",
                borderBottom: gi < PERMISSION_GROUPS.length - 1 ? "1px solid #f3f4f6" : "none",
              }}
            >
              <span className="font-semibold text-gray-800">{group.label}</span>
              {perms.map((perm, ci) => {
                if (!perm) {
                  return <div key={ci} className="flex items-center justify-center"><span className="text-gray-300 text-[18px]">—</span></div>;
                }
                const isChecked = selected.has(perm);
                const isDefault = roleDefaults.has(perm);
                return (
                  <div key={ci} className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggle(perm)}
                      className="w-5 h-5 rounded flex items-center justify-center transition-all border"
                      style={{
                        background: isChecked ? "var(--brand-primary)" : "#fff",
                        borderColor: isChecked ? "var(--brand-primary)" : isDefault ? "#d1d5db" : "#e5e7eb",
                      }}
                      title={`${group.actions[ci]} — ${isDefault ? "padrão do role" : "sem permissão padrão"}`}
                    >
                      {isChecked && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                      )}
                    </button>
                    {isDefault && !isChecked && (
                      <div className="w-1 h-1 rounded-full bg-gray-300" title="Incluído no padrão do role" />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
        Ponto cinza indica que a permissão faz parte do padrão do role mas não está ativa para este usuário.
      </p>

      {message && (
        <p className={`text-[12px] font-medium ${message.includes("salvas") ? "text-green-600" : "text-red-600"}`}>{message}</p>
      )}

      <div className="flex gap-2.5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white transition-opacity"
          style={{ background: "var(--brand-primary)", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Salvando..." : "Salvar Permissões"}
        </button>
        <button
          onClick={resetToDefaults}
          className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          Restaurar Padrão do Role
        </button>
      </div>
    </div>
  );
}
