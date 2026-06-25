import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createNotificationService } from "@/lib/services/notification.service";
import { handleApiError, unauthorizedResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();

    const supabase = await createSupabaseServerClient();
    const service = createNotificationService(supabase);
    await service.markRead(id, user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
