"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Share, Plus } from "lucide-react";

const STORAGE_KEY = "bsm_ios_install_dismissed";

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  // Safari on iOS doesn't have "CriOS" or "FxiOS"
  const isSafari = /safari/i.test(ua) && !/crios|fxios|opios|mercury/i.test(ua);
  return isIos && isSafari;
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function IosInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIosSafari()) return;
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Small delay so it doesn't flash on first paint
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 pb-8 animate-in slide-in-from-bottom-4 duration-300">
      <div className="relative mx-auto max-w-sm rounded-2xl bg-[#0a1628] border border-white/10 shadow-2xl p-5 text-white">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 rounded-full p-1 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <Image
            src="/logo.png"
            alt="BSM"
            width={44}
            height={44}
            className="rounded-xl"
          />
          <div>
            <p className="font-semibold text-sm">Instalar BSM</p>
            <p className="text-xs text-white/50">Adicione à sua tela inicial</p>
          </div>
        </div>

        <p className="text-xs text-white/70 mb-4 leading-relaxed">
          Instale o BSM como um app para acesso rápido, notificações e experiência completa sem o navegador.
        </p>

        <ol className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold flex-shrink-0">1</span>
            <span className="text-white/80 text-xs">
              Toque em{" "}
              <span className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-white font-medium">
                <Share className="h-3 w-3" /> Compartilhar
              </span>{" "}
              na barra inferior do Safari
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold flex-shrink-0">2</span>
            <span className="text-white/80 text-xs">
              Role para baixo e toque em{" "}
              <span className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-white font-medium">
                <Plus className="h-3 w-3" /> Adicionar à Tela de Início
              </span>
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold flex-shrink-0">3</span>
            <span className="text-white/80 text-xs">Toque em <strong className="text-white">Adicionar</strong> no canto superior direito</span>
          </li>
        </ol>

        <button
          onClick={dismiss}
          className="mt-4 w-full rounded-xl border border-white/20 py-2 text-xs text-white/60 hover:text-white hover:border-white/40 transition-colors"
        >
          Agora não
        </button>
      </div>

      {/* Arrow pointing down toward Safari toolbar */}
      <div className="flex justify-center mt-1">
        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#0a1628]" />
      </div>
    </div>
  );
}
