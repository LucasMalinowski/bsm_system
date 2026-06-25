import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { refresh_token?: string }
    | null;

  if (!body?.refresh_token) {
    return NextResponse.json({ error: "refresh_token is required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: body.refresh_token,
  });

  if (error || !data.session || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Invalid refresh token" },
      { status: 401 }
    );
  }

  const user = await resolveAuthUser(supabase, data.user);

  return NextResponse.json({
    ok: true,
    data: {
      user,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
      },
    },
  });
}
