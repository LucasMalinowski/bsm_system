import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-session";
import Image from "next/image";
import type { ReactNode } from "react";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getServerSession();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel — brand (desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #051e4a 0%, #0363a9 55%, #0284c7 100%)" }}
      >
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white/[0.04]" />
        <div className="pointer-events-none absolute bottom-48 right-10 w-40 h-40 rounded-full" style={{ background: "rgba(0,200,117,0.10)" }} />

        {/* Logo */}
        <div className="flex items-center gap-3.5 z-10">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
            <Image src="/logo.png" alt="BSM Logo" width={32} height={32} className="object-contain" />
          </div>
          <span className="text-[22px] font-extrabold text-white tracking-wide">BSM</span>
        </div>

        {/* Center content */}
        <div className="z-10">
          <p className="text-xs font-semibold text-white/50 tracking-widest uppercase mb-4">
            Gestão de Equipamentos Laboratoriais
          </p>
          <h2 className="text-[36px] font-extrabold text-white leading-[1.2] mb-5">
            Rastreabilidade<br />e conformidade<br />em um só lugar.
          </h2>
          <div className="flex flex-col gap-3">
            {[
              "Controle completo de calibração e manutenção",
              "Chamados multi-equipamento integrados",
              "Documentos técnicos com versionamento",
              "Acesso rápido via QR Code em campo",
            ].map((text) => (
              <div key={text} className="flex items-center gap-2.5 text-white/80 text-sm">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,200,117,0.3)" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00c875" strokeWidth="3" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Lab equipment images */}
        <div className="z-10 flex items-end gap-4">
          <div className="relative h-24 w-24 opacity-80">
            <Image src="/login-flask.png" alt="Flask" fill className="object-contain drop-shadow-lg" />
          </div>
          <div className="relative h-28 w-28 opacity-80">
            <Image src="/login-microscope.png" alt="Microscope" fill className="object-contain drop-shadow-lg" />
          </div>
          <div className="relative h-24 w-28 opacity-80">
            <Image src="/login-multimeter.png" alt="Multimeter" fill className="object-contain drop-shadow-lg" />
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white relative overflow-hidden">
        {/* Mobile logo area */}
        <div className="mb-8 text-center lg:hidden">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center overflow-hidden" style={{ background: "#0363a9" }}>
            <Image src="/logo.png" alt="BSM Logo" width={40} height={40} className="object-contain" />
          </div>
          <div className="text-[28px] font-extrabold text-gray-900 tracking-[2px]">BSM</div>
          <div className="text-xs text-gray-400 mt-1 tracking-widest">GESTÃO DE EQUIPAMENTOS</div>
        </div>

        <div className="w-full max-w-sm px-8 py-12 lg:max-w-[380px]">
          {/* Desktop heading */}
          <div className="hidden lg:block mb-9">
            <h1 className="text-[28px] font-extrabold text-gray-900 mb-2">Bem-vindo de volta</h1>
            <p className="text-sm text-gray-500">Entre com suas credenciais para acessar o sistema</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
