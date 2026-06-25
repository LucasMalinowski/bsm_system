"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Mail } from "lucide-react";

interface InviteDialogProps {
  children: ReactNode;
  companies?: { id: string; name: string }[];
  /** When true, shows company selector */
  isSuperAdmin?: boolean;
  /** Pre-selected company (admin flow) */
  defaultCompanyId?: string;
  defaultCompanyName?: string;
}

export function InviteDialog({
  children,
  companies = [],
  isSuperAdmin,
  defaultCompanyId,
  defaultCompanyName,
}: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const selectedCompanyName =
    isSuperAdmin
      ? companies.find((c) => c.id === companyId)?.name ?? ""
      : (defaultCompanyName ?? "");

  const reset = () => {
    setEmail("");
    setRole("employee");
    setCompanyId(defaultCompanyId ?? "");
    setError(null);
    setSentTo(null);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!email) { setError("Email é obrigatório."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Email inválido."); return; }
    if (isSuperAdmin && !companyId) { setError("Selecione uma empresa."); return; }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, company_id: companyId || undefined }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Erro ao criar convite.");
      return;
    }

    setSentTo(email);
    setEmail("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Convidar Usuário
            {selectedCompanyName && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                — {selectedCompanyName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {sentTo ? (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Convite enviado!</p>
              <p className="mt-1 text-sm text-gray-500">
                Um email com o link de convite foi enviado para{" "}
                <strong className="text-gray-800">{sentTo}</strong>.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" onClick={reset}>Convidar outro</Button>
              <Button onClick={() => setOpen(false)}>Fechar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isSuperAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  <option value="">Selecione uma empresa</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {!isSuperAdmin && selectedCompanyName && (
              <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                Convidando para a organização{" "}
                <strong className="text-gray-900">{selectedCompanyName}</strong>
              </div>
            )}

            <Input
              label="Email do convidado"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "employee")}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              >
                <option value="employee">Funcionário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} isLoading={loading}>
                <Mail className="h-4 w-4" />
                Enviar Convite
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
