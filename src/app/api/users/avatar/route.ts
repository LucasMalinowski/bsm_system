import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isAdmin(user)) return forbiddenResponse();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `avatars/${user.company_id}/${crypto.randomUUID()}.${ext}`;

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

    return NextResponse.json({ url: publicUrl, path });
  } catch (err) {
    return handleApiError(err);
  }
}
