import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: companyId } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();

    // Only super_admin or admin of this company
    if (user.role !== "super_admin" && user.company_id !== companyId) {
      return forbiddenResponse();
    }
    if (user.role === "employee") return forbiddenResponse();

    const formData = await request.formData();
    const file = formData.get("logo") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "png";
    const storagePath = `${companyId}/logo.${ext}`;

    // Use admin client for company-assets uploads
    const admin = createSupabaseAdminClient();
    const { error: uploadErr } = await admin.storage
      .from("company-assets")
      .upload(storagePath, file, { contentType: file.type, upsert: true });

    if (uploadErr) throw new Error(uploadErr.message);

    const { data: urlData } = admin.storage.from("company-assets").getPublicUrl(storagePath);
    const logoUrl = urlData.publicUrl;

    // Update company record
    const supabase = await createSupabaseServerClient();
    const { error: updateErr } = await supabase
      .from("companies")
      .update({ logo_url: logoUrl })
      .eq("id", companyId);

    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({ data: { logo_url: logoUrl } });
  } catch (err) {
    return handleApiError(err);
  }
}
