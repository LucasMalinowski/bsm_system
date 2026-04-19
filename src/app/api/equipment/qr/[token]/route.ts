import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEquipmentService } from "@/lib/services/equipment.service";

type Params = { params: Promise<{ token: string }> };

// Public QR scan endpoint — resolves token to equipment and redirects
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    const supabase = await createSupabaseServerClient();
    const service = createEquipmentService(supabase);
    const equipment = await service.getByQRToken(token);

    if (!equipment) {
      return NextResponse.redirect(new URL("/not-found", process.env.NEXT_PUBLIC_APP_URL!));
    }

    return NextResponse.redirect(
      new URL(`/equipment/${equipment.id}`, process.env.NEXT_PUBLIC_APP_URL!)
    );
  } catch {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL!));
  }
}
