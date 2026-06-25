"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const CAT_COLORS: Record<string, string> = {
  Pesagem: "#0363a9", Óptica: "#7c3aed", Química: "#059669",
  Esterilização: "#dc2626", Separação: "#d97706",
  Temperatura: "#ea580c", Microbiologia: "#0891b2",
};

interface RecentScan {
  id: string;
  name: string;
  internal_code: string;
  category?: { name: string } | null;
  scanned_at: number;
}

const STORAGE_KEY = "bsm_recent_scans";

function getRecentScans(): RecentScan[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)} dia${Math.floor(diff / 86400) > 1 ? "s" : ""}`;
}

export function QRScannerClient() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [recent, setRecent] = useState<RecentScan[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    setRecent(getRecentScans());
  }, []);

  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current || processingRef.current) {
      if (streamRef.current) rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    try {
      const jsQR = (await import("jsqr")).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        processingRef.current = true;
        await handleScannedValue(code.data);
        processingRef.current = false;
        return;
      }
    } catch {/* ignore */}

    rafRef.current = requestAnimationFrame(processFrame);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startCamera = async () => {
    setCameraError(false);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      rafRef.current = requestAnimationFrame(processFrame);
    } catch {
      setCameraError(true);
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => { stopCamera(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScannedValue = async (value: string) => {
    // QR codes encode the full URL — extract the token from the path
    let token = value;
    try {
      const url = new URL(value);
      const parts = url.pathname.split("/");
      token = parts[parts.length - 1];
    } catch {/* not a URL, use as-is */}
    await handleManualCode(token);
  };

  const handleManualCode = async (code: string) => {
    if (!code.trim()) return;
    try {
      const res = await fetch(`/api/equipment/qr/${encodeURIComponent(code.trim())}`);
      if (!res.ok) return;
      const eq = await res.json();
      const scan: RecentScan = {
        id: eq.id,
        name: eq.name,
        internal_code: eq.internal_code,
        category: eq.category,
        scanned_at: Date.now(),
      };
      const updated = [scan, ...getRecentScans().filter((r) => r.id !== eq.id)].slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setRecent(updated);
      router.push(`/equipment/${eq.id}`);
    } catch { /* ignore */ }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f9fafb] pb-20 lg:pb-0">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center gap-3 px-4 pt-14 pb-3 bg-white border-b border-gray-200">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className="text-[16px] font-bold text-gray-900">Scanner QR</span>
      </div>

      {/* Desktop title */}
      <div className="hidden lg:block px-7 pt-7 pb-2">
        <h1 className="text-[22px] font-extrabold text-gray-900">Scanner QR</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Escaneie o QR Code de um equipamento</p>
      </div>

      <div className="flex flex-col gap-4 p-4 lg:p-7 max-w-lg mx-auto w-full">
        {/* Camera viewfinder */}
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: 20,
            background: "#0a0f1a",
            aspectRatio: "1/1",
          }}
        >
          {/* Radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(3,99,169,0.15) 0%, transparent 70%)" }}
          />

          {/* Hidden canvas for QR decoding */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Video feed */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            style={{ display: scanning ? "block" : "none" }}
          />

          {/* Corner brackets */}
          {([
            { top: 40, left: 40, btr: "8px 0 0 0", bt: true, bl: true },
            { bottom: 40, left: 40, btr: "0 0 0 8px", bb: true, bl: true },
            { top: 40, right: 40, btr: "0 8px 0 0", bt: true, br: true },
            { bottom: 40, right: 40, btr: "0 0 8px 0", bb: true, br: true },
          ] as Array<Record<string, unknown>>).map((pos, i) => (
            <div
              key={i}
              className="absolute w-9 h-9 pointer-events-none"
              style={{
                top: pos.top as number | undefined,
                bottom: pos.bottom as number | undefined,
                left: pos.left as number | undefined,
                right: pos.right as number | undefined,
                borderRadius: pos.btr as string,
                borderTop: pos.bt ? "3px solid #0363a9" : undefined,
                borderBottom: pos.bb ? "3px solid #0363a9" : undefined,
                borderLeft: pos.bl ? "3px solid #0363a9" : undefined,
                borderRight: pos.br ? "3px solid #0363a9" : undefined,
              }}
            />
          ))}

          {/* Scan line */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: 48, right: 48, height: 2,
              background: "linear-gradient(90deg, transparent, #0363a9, transparent)",
              top: "40%", borderRadius: 2,
              boxShadow: "0 0 12px rgba(3,99,169,0.8)",
            }}
          />

          {/* Center content */}
          {!scanning && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/>
                <rect x="16" y="3" width="5" height="5"/>
                <path d="M21 16h-3v3M21 21h-1M16 16h1v1"/>
                <path d="M5.5 5.5h0M5.5 18.5h0M18.5 5.5h0"/>
              </svg>
              <p className="text-[13px] mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>Aponte para o QR Code</p>
              <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>do equipamento</p>
              <button
                onClick={startCamera}
                className="mt-5 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white border border-white/20 hover:bg-white/10 transition-colors"
              >
                Ativar Câmera
              </button>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6 text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              <p className="text-[13px] mt-3" style={{ color: "rgba(255,255,255,0.5)" }}>Câmera não disponível</p>
              <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>Use o código manual abaixo</p>
            </div>
          )}

          {scanning && (
            <button
              onClick={stopCamera}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Manual code entry */}
        <div className="bg-white border border-gray-200 rounded-xl p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Código Manual</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleManualCode(fd.get("code") as string);
              (e.target as HTMLFormElement).reset();
            }}
            className="flex gap-2"
          >
            <input
              name="code"
              placeholder="Ex: EQ-2024-001"
              className="flex-1 h-10 rounded-lg border border-gray-300 px-3 text-[13px] outline-none focus:border-[#0363a9] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] transition-all font-mono"
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "#0363a9" }}
            >
              Buscar
            </button>
          </form>
        </div>

        {/* Recent scans */}
        {recent.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <p className="text-[14px] font-semibold text-gray-900">Scans Recentes</p>
            {recent.map((r) => {
              const catName = r.category?.name ?? "";
              const color = CAT_COLORS[catName] ?? "#0363a9";
              return (
                <button
                  key={r.id}
                  onClick={() => router.push(`/equipment/${r.id}`)}
                  className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3 text-left w-full transition-colors hover:bg-gray-50"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                >
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                    style={{ background: color + "18" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-gray-900 truncate">{r.name}</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">{r.internal_code}</div>
                  </div>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(r.scanned_at)}</span>
                </button>
              );
            })}
          </div>
        )}

        {recent.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-[13px]">
            Nenhum scan recente
          </div>
        )}
      </div>
    </div>
  );
}
