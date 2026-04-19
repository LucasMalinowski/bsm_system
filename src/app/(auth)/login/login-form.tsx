"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth.schemas";
import Link from "next/link";

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <path d="M22 6l-10 7L2 6"/>
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>
  </svg>
);

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);

    let response: Response;
    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch {
      setServerError("Nao foi possivel conectar. Tente novamente.");
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setServerError(payload?.error ?? "Nao foi possivel entrar agora. Tente novamente.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const inputBase =
    "w-full h-11 rounded-[10px] border text-sm outline-none box-border transition-all duration-150 " +
    "border-white/20 bg-white/10 text-white placeholder-white/40 px-4 " +
    "focus:border-white/50 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)]";

  return (
    <div className="flex flex-col gap-4">
      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-white/80">E-mail</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
            <MailIcon />
          </div>
          <input
            type="email"
            placeholder="seu@email.com"
            {...register("email")}
            className={`${inputBase} pl-10`}
          />
        </div>
        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <label className="text-[13px] font-semibold text-white/80">Senha</label>
          <Link
            href="/forgot-password"
            className="text-[12px] text-white/50 hover:text-white/80 transition-colors"
          >
            Esqueceu sua senha?
          </Link>
        </div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
            <LockIcon />
          </div>
          <input
            type={showPass ? "text" : "password"}
            placeholder="••••••••"
            {...register("password")}
            className={`${inputBase} pl-10 pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors p-1"
            tabIndex={-1}
          >
            {showPass ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>

      {serverError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-2 text-sm text-red-300">
          {serverError}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        className="mt-1 h-[52px] rounded-[12px] border-none text-base font-bold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: isSubmitting
            ? "rgba(255,255,255,0.10)"
            : "linear-gradient(90deg, #0363a9 0%, #00b86e 100%)",
          boxShadow: isSubmitting ? "none" : "0 8px 24px rgba(3,99,169,0.5)",
        }}
      >
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>

      {/* Trust badges */}
      <div className="flex gap-5 justify-center mt-6">
        {["ISO 17025", "Multi-tenant", "PWA"].map((t) => (
          <div key={t} className="flex items-center gap-1.5 text-[11px] text-white/40">
            <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}
