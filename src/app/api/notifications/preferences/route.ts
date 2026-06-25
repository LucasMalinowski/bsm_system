import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, unauthorizedResponse } from "@/lib/utils/errors";
import { z } from "zod";

const prefsSchema = z.object({
  cal_alert:  z.boolean().optional(),
  unassigned: z.boolean().optional(),
  weekly:     z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("notification_preferences")
      .select("cal_alert, unassigned, weekly")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      data: data ?? { cal_alert: true, unassigned: true, weekly: false },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const input = prefsSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...input }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}
