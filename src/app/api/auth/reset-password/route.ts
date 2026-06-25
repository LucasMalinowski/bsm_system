import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/validations/auth.schemas";
import { checkRateLimit, getClientIp } from "@/lib/utils/rate-limit";

export async function POST(request: NextRequest) {
  const allowed = await checkRateLimit(`reset-password:${getClientIp(request)}`, 5, 300);
  if (!allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em alguns minutos." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Always return ok, even if the email doesn't match an account — don't leak
  // which emails are registered.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/update-password`,
  });

  return NextResponse.json({ ok: true });
}
