import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v5" />
            <path d="M12 16h.01" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Acesso negado</h1>
        <p className="mt-2 text-sm text-gray-500">
          Sua conta nao tem permissao para abrir esta tela.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
