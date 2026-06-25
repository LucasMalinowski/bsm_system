import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createNotificationService } from "@/lib/services/notification.service";
import { handleApiError, unauthorizedResponse } from "@/lib/utils/errors";

export async function POST() {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();

    const supabase = await createSupabaseServerClient();
    const service = createNotificationService(supabase);
    await service.markAllRead(user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
