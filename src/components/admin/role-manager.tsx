"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PERMISSIONS, DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/auth/permissions";
import type { Permission, UserRole } from "@/types";

const PERMISSION_GROUPS = [
  {
    label: "Equipamentos",
    permissions: [
      PERMISSIONS.EQUIPMENT_READ,
      PERMISSIONS.EQUIPMENT_CREATE,
      PERMISSIONS.EQUIPMENT_UPDATE,
      PERMISSIONS.EQUIPMENT_DELETE,
    ],
  },
  {
    label: "Chamados",
    permissions: [
      PERMISSIONS.TICKET_READ,
      PERMISSIONS.TICKET_CREATE,
      PERMISSIONS.TICKET_UPDATE,
      PERMISSIONS.TICKET_DELETE,
      PERMISSIONS.TICKET_ASSIGN,
    ],
  },
  {
    label: "Documentos",
    permissions: [
      PERMISSIONS.DOCUMENT_READ,
      PERMISSIONS.DOCUMENT_UPLOAD,
      PERMISSIONS.DOCUMENT_UPDATE,
      PERMISSIONS.DOCUMENT_DELETE,
    ],
  },
  {
    label: "Usuários",
    permissions: [
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_INVITE,
      PERMISSIONS.USER_UPDATE,
      PERMISSIONS.USER_DELETE,
    ],
  },
  {
    label: "Empresa",
    permissions: [
      PERMISSIONS.COMPANY_READ,
      PERMISSIONS.COMPANY_UPDATE,
      PERMISSIONS.COMPANY_SETTINGS,
      PERMISSIONS.REPORT_VIEW,
    ],
  },
];

const PERMISSION_LABELS: Record<Permission, string> = {
  "equipment:read": "Visualizar",
  "equipment:create": "Criar",
  "equipment:update": "Editar",
  "equipment:delete": "Excluir",
  "ticket:read": "Visualizar",
  "ticket:create": "Criar",
  "ticket:update": "Editar",
  "ticket:delete": "Excluir",
  "ticket:assign": "Atribuir",
  "document:read": "Visualizar",
  "document:upload": "Upload",
  "document:update": "Editar",
  "document:delete": "Excluir",
  "user:read": "Visualizar",
  "user:invite": "Convidar",
  "user:update": "Editar",
  "user:delete": "Excluir",
  "company:read": "Visualizar",
  "company:update": "Editar",
  "company:settings": "Configurações",
  "report:view": "Relatórios",
};

interface RoleManagerProps {
  userId: string;
  currentPermissions: Permission[];
  userRole: UserRole;
}

export function RoleManager({ userId, currentPermissions, userRole }: RoleManagerProps) {
  const [selected, setSelected] = useState<Set<Permission>>(new Set(currentPermissions));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggle = (permission: Permission) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
  };

  const resetToDefaults = () => {
    setSelected(new Set(DEFAULT_PERMISSIONS_BY_ROLE[userRole]));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    const res = await fetch(`/api/users/${userId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: Array.from(selected) }),
    });

    setIsSaving(false);
    setMessage(res.ok ? "Permissões salvas!" : "Erro ao salvar.");
  };

  return (
    <div className="space-y-6">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label}>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">{group.label}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {group.permissions.map((permission) => (
              <label
                key={permission}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-2.5 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(permission)}
                  onChange={() => toggle(permission)}
                  className="h-4 w-4 rounded border-gray-300 accent-[var(--brand-primary)]"
                />
                <span className="text-sm text-gray-700">
                  {PERMISSION_LABELS[permission]}
                </span>
                <span className="text-xs text-gray-400 font-mono">{permission.split(":")[1]}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {message && (
        <p className={`text-sm ${message.includes("salvas") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSave} isLoading={isSaving}>
          Salvar Permissões
        </Button>
        <Button variant="outline" onClick={resetToDefaults}>
          Restaurar Padrão
        </Button>
      </div>
    </div>
  );
}
