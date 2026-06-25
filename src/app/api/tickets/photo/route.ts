import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.TICKET_CREATE)) return forbiddenResponse();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const prefix = user.company_id ?? user.id;
    const path = `${prefix}/${crypto.randomUUID()}.${ext}`;

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage
      .from("ticket-photos")
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const signedResult = await supabase.storage
      .from("ticket-photos")
      .createSignedUrl(path, 60 * 60 * 24 * 365);

    return NextResponse.json({ url: signedResult.data?.signedUrl ?? null, path });
  } catch (err) {
    return handleApiError(err);
  }
}
