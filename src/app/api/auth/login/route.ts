import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth.schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados de login invalidos" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "E-mail ou senha incorretos" },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const cause = error instanceof Error ? (error as Error & { cause?: NodeJS.ErrnoException }).cause : undefined;

    if (cause?.code === "ENOTFOUND") {
      return NextResponse.json(
        { error: "Nao foi possivel conectar ao Supabase. Verifique sua internet, DNS ou a URL do projeto." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Nao foi possivel entrar agora. Tente novamente." },
      { status: 500 }
    );
  }
}
