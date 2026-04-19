import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-session";
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
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="9" height="2.5" rx="1" fill="white" opacity="0.9"/>
              <rect x="3" y="7.5" width="18" height="2.5" rx="1" fill="white" opacity="0.9"/>
              <rect x="3" y="12" width="14" height="2.5" rx="1" fill="white" opacity="0.9"/>
              <rect x="3" y="16.5" width="9" height="2.5" rx="1" fill="white" opacity="0.6"/>
            </svg>
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

        {/* Lab illustration */}
        <div className="z-10">
          <svg width="340" height="100" viewBox="0 0 340 100" fill="none">
            <ellipse cx="60" cy="96" rx="34" ry="4" fill="rgba(255,255,255,0.08)"/>
            <rect x="52" y="52" width="16" height="44" rx="3" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
            <ellipse cx="60" cy="50" rx="15" ry="8" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
            <rect x="57" y="30" width="7" height="22" rx="2" fill="rgba(255,255,255,0.25)"/>
            <ellipse cx="60.5" cy="28" rx="13" ry="7" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
            <ellipse cx="170" cy="96" rx="30" ry="4" fill="rgba(255,255,255,0.08)"/>
            <path d="M157 42h26v10l20 44H137L157 52z" fill="rgba(0,200,117,0.2)" stroke="rgba(0,200,117,0.4)" strokeWidth="1.5"/>
            <rect x="159" y="38" width="22" height="6" rx="2" fill="rgba(0,200,117,0.4)"/>
            <ellipse cx="170" cy="84" rx="16" ry="5" fill="rgba(0,200,117,0.2)"/>
            <circle cx="163" cy="70" r="3" fill="rgba(0,200,117,0.4)"/>
            <circle cx="175" cy="60" r="2" fill="rgba(0,200,117,0.3)"/>
            <ellipse cx="280" cy="96" rx="32" ry="4" fill="rgba(255,255,255,0.08)"/>
            <rect x="256" y="34" width="48" height="62" rx="7" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
            <rect x="262" y="40" width="36" height="26" rx="3" fill="rgba(255,255,255,0.25)"/>
            <circle cx="280" cy="78" r="10" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
            <circle cx="268" cy="90" r="3.5" fill="rgba(255,80,80,0.5)"/>
            <circle cx="292" cy="90" r="3.5" fill="rgba(80,220,120,0.5)"/>
          </svg>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, #0e3a6e 0%, #071426 55%, #020d1e 100%)",
        }}
      >
        {/* Mobile glow blobs */}
        <div className="pointer-events-none absolute -top-10 -right-16 w-52 h-52 rounded-full lg:hidden" style={{ background: "rgba(3,99,169,0.18)" }} />
        <div className="pointer-events-none absolute bottom-40 -left-20 w-60 h-60 rounded-full lg:hidden" style={{ background: "rgba(0,138,219,0.10)" }} />

        <div className="w-full max-w-sm px-8 py-12 z-10 lg:max-w-[380px]">
          {/* Mobile logo */}
          <div className="mb-9 text-center lg:hidden">
            <div className="w-[72px] h-[72px] rounded-[20px] mx-auto mb-3.5 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0363a9 0%, #00b86e 100%)", boxShadow: "0 12px 32px rgba(3,99,169,0.45)" }}>
              <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
                <rect x="8" y="8" width="16" height="3.5" rx="1.5" fill="white" opacity="0.9"/>
                <rect x="8" y="14" width="24" height="3.5" rx="1.5" fill="white" opacity="0.9"/>
                <rect x="8" y="20" width="20" height="3.5" rx="1.5" fill="white" opacity="0.9"/>
                <rect x="8" y="26" width="12" height="3.5" rx="1.5" fill="white" opacity="0.6"/>
                <circle cx="31" cy="31" r="7" fill="#00c875" opacity="0.9"/>
                <path d="M28 31l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <div className="text-[34px] font-extrabold text-white tracking-[3px]">BSM</div>
            <div className="text-xs text-white/45 mt-1 tracking-widest">GESTÃO DE EQUIPAMENTOS</div>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-9">
            <h1 className="text-[28px] font-extrabold text-white mb-2">Bem-vindo de volta</h1>
            <p className="text-sm text-white/60">Entre com suas credenciais para acessar o sistema</p>
          </div>

          {children}
        </div>

        {/* Mobile lab illustration */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center pb-4 pointer-events-none lg:hidden">
          <svg width="300" height="80" viewBox="0 0 300 80" fill="none">
            <ellipse cx="60" cy="76" rx="32" ry="4" fill="rgba(255,255,255,0.06)"/>
            <rect x="52" y="40" width="16" height="36" rx="3" fill="rgba(0,138,219,0.25)" stroke="rgba(0,138,219,0.5)" strokeWidth="1"/>
            <ellipse cx="60" cy="38" rx="15" ry="8" fill="rgba(0,138,219,0.35)" stroke="rgba(0,138,219,0.6)" strokeWidth="1"/>
            <rect x="57" y="20" width="7" height="20" rx="2" fill="rgba(0,138,219,0.5)"/>
            <ellipse cx="60.5" cy="18" rx="12" ry="6" fill="rgba(0,138,219,0.6)" stroke="rgba(0,138,219,0.8)" strokeWidth="1"/>
            <ellipse cx="150" cy="76" rx="28" ry="4" fill="rgba(255,255,255,0.06)"/>
            <path d="M138 32h24v8l18 36H120L138 40z" fill="rgba(0,200,117,0.15)" stroke="rgba(0,200,117,0.45)" strokeWidth="1.5"/>
            <rect x="140" y="28" width="20" height="6" rx="2" fill="rgba(0,200,117,0.4)"/>
            <ellipse cx="240" cy="76" rx="30" ry="4" fill="rgba(255,255,255,0.06)"/>
            <rect x="216" y="20" width="48" height="56" rx="7" fill="rgba(3,99,169,0.25)" stroke="rgba(3,99,169,0.5)" strokeWidth="1.5"/>
            <rect x="222" y="26" width="36" height="24" rx="3" fill="rgba(3,99,169,0.5)"/>
            <circle cx="240" cy="62" r="9" fill="rgba(3,99,169,0.6)" stroke="rgba(3,99,169,0.8)" strokeWidth="1"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
