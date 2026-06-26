import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createEquipmentService } from "@/lib/services/equipment.service";

type Params = { params: Promise<{ token: string }> };

// Public QR scan endpoint — resolves token to equipment.
// When Accept: application/json, returns { equipment_id }. Otherwise redirects.
export async function GET(req: NextRequest, { params }: Params) {
  const wantsJson = req.headers.get("accept")?.includes("application/json");
  try {
    const { token } = await params;

    const supabase = createSupabaseAdminClient();
    const service = createEquipmentService(supabase);
    const equipment = await service.getByQRToken(token);

    if (!equipment) {
      if (wantsJson) return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
      return NextResponse.redirect(new URL("/not-found", req.nextUrl.origin));
    }

    if (wantsJson) return NextResponse.json({ equipment_id: equipment.id });
    return NextResponse.redirect(new URL(`/equipment/${equipment.id}`, req.nextUrl.origin));
  } catch {
    if (wantsJson) return NextResponse.json({ error: "Server error" }, { status: 500 });
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
}
