"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validations/auth.schemas";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setServerError("E-mail ou senha incorretos");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-1 md:text-gray-700">
          E-mail
        </label>
        <input
          type="email"
          placeholder="seu@email.com"
          {...register("email")}
          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 transition md:border-gray-300 md:bg-white md:text-gray-900 md:placeholder-gray-400 md:focus:border-[var(--brand-primary)] md:focus:ring-[var(--brand-primary)]/20"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-400 md:text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-1 md:text-gray-700">
          Senha
        </label>
        <input
          type="password"
          placeholder="••••••••"
          {...register("password")}
          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 transition md:border-gray-300 md:bg-white md:text-gray-900 md:placeholder-gray-400 md:focus:border-[var(--brand-primary)] md:focus:ring-[var(--brand-primary)]/20"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-400 md:text-red-600">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <p className="rounded-xl bg-red-500/20 border border-red-500/30 px-3 py-2 text-sm text-red-300 md:bg-red-50 md:border-red-200 md:text-red-700">
          {serverError}
        </p>
      )}

      {/* Submit — gradient on mobile, brand color on desktop */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="relative mt-2 w-full overflow-hidden rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed
          bg-gradient-to-r from-teal-400 to-cyan-500 shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:brightness-110
          md:from-[var(--brand-primary)] md:to-[var(--brand-primary)] md:shadow-none md:hover:brightness-90"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
          </span>
        ) : (
          "Entrar"
        )}
      </button>

      <p className="text-center text-sm text-white/50 md:text-gray-500">
        <Link href="/forgot-password" className="text-teal-400 hover:underline md:text-[var(--brand-primary)]">
          Esqueceu a senha?
        </Link>
      </p>
    </form>
  );
}
