"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

interface InviteClientProps {
  token: string;
  email: string;
  companyName: string;
}

type Stage = "loading" | "awaiting_session" | "form" | "submitting" | "done" | "error";

export function InviteClient({ token, email, companyName }: InviteClientProps) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("loading");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // onAuthStateChange fires when Supabase detects the access_token hash from the email link
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (session) {
          setStage("form");
        } else if (event === "INITIAL_SESSION" && !session) {
          setStage("awaiting_session");
        }
      }
    );

    // Also check if there's already an active session
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (data.session) setStage("form");
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError("Você precisa concordar com os Termos e Condições."); return; }
    if (!firstName.trim()) { setError("Nome é obrigatório."); return; }

    setStage("submitting");
    setError(null);

    const formData = new FormData();
    formData.set("first_name", firstName.trim());
    formData.set("last_name", lastName.trim());
    if (avatar) formData.set("avatar", avatar);

    const res = await fetch(`/api/invitations/${token}/accept`, {
      method: "POST",
      body: formData,
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Erro ao aceitar convite.");
      setStage("form");
      return;
    }

    setStage("done");
    // Give a moment for the success state to show, then redirect
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  const initials = firstName ? firstName[0].toUpperCase() : email[0].toUpperCase();

  if (stage === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (stage === "awaiting_session") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-slate-100 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Verifique seu email</h1>
          <p className="mt-2 text-sm text-gray-500">
            Clique no link do convite enviado para <strong>{email}</strong> para acessar esta página.
          </p>
          <p className="mt-4 text-xs text-gray-400">
            Se já clicou no link, tente reabri-lo no mesmo navegador.
          </p>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-slate-100 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Bem-vindo ao BSM!</h1>
          <p className="mt-2 text-sm text-gray-500">Redirecionando para o painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Aceitar Convite</h1>
          <p className="mt-1 text-sm text-gray-400">Entrar em <span className="font-medium text-gray-600">{companyName}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative h-16 w-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors group"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-semibold text-gray-400">{initials}</span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Adicionar Foto
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatar} />
          </div>

          {/* Email (readonly) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="João"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Silva"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* T&C */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-600">
              Concordo com os{" "}
              <Link href="/terms" target="_blank" className="text-teal-600 hover:underline">
                Termos e Condições
              </Link>
            </span>
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={stage === "submitting" || !agreed || !firstName.trim()}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {stage === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />}
            {stage === "submitting" ? "Entrando..." : "Aceitar & Continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
