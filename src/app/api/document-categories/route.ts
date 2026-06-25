import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin, isSuperAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";
import { z } from "zod";

const createSchema = z.object({
  name:        z.string().min(1).max(80),
  description: z.string().max(200).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();

    const companyId = isSuperAdmin(user)
      ? (new URL(request.url).searchParams.get("company_id") ?? user.company_id)
      : user.company_id;

    if (!companyId) return forbiddenResponse("company_id required");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("document_categories")
      .select("id, name, description, created_at")
      .eq("company_id", companyId)
      .order("name");

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isAdmin(user) && !isSuperAdmin(user)) return forbiddenResponse();
    if (!user.company_id) return forbiddenResponse("company_id required");

    const body = await request.json();
    const input = createSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("document_categories")
      .insert({ ...input, company_id: user.company_id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
