import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/lib/validations/auth.schemas";
import { resolveAuthUser } from "@/lib/auth/get-session";
import { checkRateLimit, getClientIp } from "@/lib/utils/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const allowed = await checkRateLimit(`login:${getClientIp(request)}`, 10, 60);
    if (!allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas de login. Tente novamente em um minuto." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados de login invalidos" },
        { status: 400 }
      );
    }

    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Collect cookies Supabase wants to set so we can apply them to the final response.
    const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      publishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              pendingCookies.push({ name, value, options: options as Record<string, unknown> });
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      if (error.status === 0 || error.message === "fetch failed") {
        return NextResponse.json(
          { error: "Nao foi possivel conectar ao Supabase. Verifique sua internet ou tente novamente." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: error.message || "E-mail ou senha incorretos" },
        { status: 401 }
      );
    }

    if (!data.session || !data.user) {
      return NextResponse.json(
        { error: "Login falhou: sessão não retornada pelo Supabase." },
        { status: 500 }
      );
    }

    const authUser = await resolveAuthUser(supabase, data.user);
    if (!authUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado ou inativo." },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      data: {
        user: authUser,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
          token_type: data.session.token_type,
        },
      },
    });

    // Apply Supabase session cookies so web clients still work.
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    });

    return response;
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
