"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  initialName: string;
  initialRole: string;
  initialAvatarUrl?: string | null;
  initialIsActive?: boolean;
  isSelf?: boolean;
}

const ROLES = [
  { value: "employee", label: "Funcionário" },
  { value: "admin", label: "Administrador" },
];

export function UserEditCard({ userId, initialName, initialRole, initialAvatarUrl, initialIsActive = true, isSelf = false }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState(initialRole);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [togglingActive, setTogglingActive] = useState(false);

  const toggleActive = async () => {
    setTogglingActive(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${userId}/deactivate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (res.ok) {
        setIsActive(!isActive);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setMessage(d.error ?? "Erro ao alterar status do usuário");
      }
    } catch {
      setMessage("Erro ao alterar status do usuário");
    }
    setTogglingActive(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      let finalAvatarUrl = avatarUrl;

      if (avatarFile) {
        const fd = new FormData();
        fd.append("file", avatarFile);
        const upRes = await fetch("/api/users/avatar", { method: "POST", body: fd });
        if (upRes.ok) {
          const { url } = await upRes.json();
          finalAvatarUrl = url;
        }
      }

      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, avatar_url: finalAvatarUrl }),
      });

      if (res.ok) {
        setMessage("Informações salvas!");
        setAvatarUrl(finalAvatarUrl);
        setAvatarFile(null);
        router.refresh();
      } else {
        setMessage("Erro ao salvar.");
      }
    } catch {
      setMessage("Erro ao salvar.");
    }
    setSaving(false);
  };

  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {avatarPreview ? (
            <img src={avatarPreview} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-[20px] font-bold">
              {initials}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-8 px-3 rounded-lg text-[12px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            {avatarFile ? "Trocar foto" : "Alterar foto"}
          </button>
          {avatarFile && (
            <button
              type="button"
              onClick={() => { setAvatarFile(null); setAvatarPreview(avatarUrl); }}
              className="text-[11px] text-red-500 hover:text-red-600"
            >
              Cancelar
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }
          }} />
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="text-[13px] font-semibold text-gray-700 block mb-1.5">Nome</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-10 rounded-lg border border-gray-300 px-3 text-[13px] text-gray-900 outline-none focus:border-[#0363a9] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] transition-all"
        />
      </div>

      {/* Role */}
      <div>
        <label className="text-[13px] font-semibold text-gray-700 block mb-1.5">Perfil</label>
        <div className="flex gap-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className="flex-1 h-10 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all"
              style={{
                border: role === r.value ? "2px solid #0363a9" : "1px solid #e5e7eb",
                background: role === r.value ? "#e0f0fb" : "#fff",
                color: role === r.value ? "#0363a9" : "#374151",
                fontFamily: "inherit",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p className={`text-[12px] font-medium ${message.includes("salvas") ? "text-green-600" : "text-red-600"}`}>{message}</p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white transition-opacity"
          style={{ background: "var(--brand-primary)", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>

        {!isSelf && (
          <button
            onClick={toggleActive}
            disabled={togglingActive}
            className="h-9 px-4 rounded-lg text-[13px] font-semibold border transition-colors disabled:opacity-50"
            style={{
              borderColor: isActive ? "#fca5a5" : "#86efac",
              color: isActive ? "#dc2626" : "#16a34a",
              background: isActive ? "#fef2f2" : "#f0fdf4",
            }}
          >
            {togglingActive ? "..." : isActive ? "Desativar conta" : "Ativar conta"}
          </button>
        )}
      </div>
    </div>
  );
}
