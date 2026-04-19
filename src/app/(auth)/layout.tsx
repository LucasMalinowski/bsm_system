import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-session";
import type { ReactNode } from "react";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getServerSession();
  if (user) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a1628] p-4 md:bg-gradient-to-br md:from-[var(--brand-accent)] md:to-white">

      {/* Desktop: simple white card, no background assets */}
      <div className="relative z-10 w-full max-w-md md:rounded-2xl md:bg-white md:p-8 md:shadow-xl">
        <div className="mb-8 text-center">
          {/* Logo — white on mobile, brand color on desktop */}
          <h1 className="text-3xl font-bold text-white md:text-[var(--brand-primary)]">BSM</h1>
          <p className="mt-1 text-sm text-white/60 md:text-gray-500">Gestão de Equipamentos</p>
        </div>
        {children}
      </div>

      {/* Mobile-only lab asset images at bottom */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 flex items-end justify-between md:hidden" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-microscope.png"
          alt=""
          className="h-48 w-auto object-contain opacity-70 translate-y-4"
          style={{ filter: "drop-shadow(0 -8px 16px rgba(0,0,0,0.4))" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-flask.png"
          alt=""
          className="h-36 w-auto object-contain opacity-60 self-end mb-2"
          style={{ filter: "drop-shadow(0 -4px 12px rgba(0,0,0,0.3))" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-multimeter.png"
          alt=""
          className="h-44 w-auto object-contain opacity-70 translate-y-2"
          style={{ filter: "drop-shadow(0 -8px 16px rgba(0,0,0,0.4))" }}
        />
      </div>
    </div>
  );
}
