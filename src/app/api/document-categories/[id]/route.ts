import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin, isSuperAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isAdmin(user) && !isSuperAdmin(user)) return forbiddenResponse();
    if (!user.company_id) return forbiddenResponse("company_id required");

    const supabase = await createSupabaseServerClient();

    const { data: cat } = await supabase
      .from("document_categories")
      .select("id")
      .eq("id", id)
      .eq("company_id", user.company_id)
      .maybeSingle();

    if (!cat) return notFoundResponse("Category not found");

    const { error } = await supabase
      .from("document_categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ message: "deleted" });
  } catch (err) {
    return handleApiError(err);
  }
}
