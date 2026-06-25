import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.EQUIPMENT_CREATE)) return forbiddenResponse();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.company_id}/${crypto.randomUUID()}.${ext}`;

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage
      .from("equipment-photos")
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from("equipment-photos").getPublicUrl(path);

    return NextResponse.json({ url: publicUrl, path });
  } catch (err) {
    return handleApiError(err);
  }
}
