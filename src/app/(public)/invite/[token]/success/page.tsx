import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function InviteSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Conta criada!</h1>
        <p className="mt-3 text-sm text-gray-500">
          Sua conta foi criada com sucesso. Verifique seu e-mail para definir sua senha e
          acessar a plataforma.
        </p>
        <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Verifique sua caixa de entrada — enviamos um e-mail com o link para criar sua senha.
        </div>
        <Link
          href="/login"
          className="mt-6 inline-block w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          Ir para o Login
        </Link>
      </div>
    </div>
  );
}
