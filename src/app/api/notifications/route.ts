import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createNotificationService } from "@/lib/services/notification.service";
import { handleApiError, unauthorizedResponse } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const supabase = await createSupabaseServerClient();
    const service = createNotificationService(supabase);
    const notifications = await service.list(user.id, unreadOnly);

    return NextResponse.json({ data: notifications });
  } catch (err) {
    return handleApiError(err);
  }
}
