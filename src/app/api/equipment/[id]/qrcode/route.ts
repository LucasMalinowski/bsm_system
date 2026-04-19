import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEquipmentService } from "@/lib/services/equipment.service";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/utils/errors";
import QRCode from "qrcode";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.EQUIPMENT_READ)) return forbiddenResponse();

    const supabase = await createSupabaseServerClient();
    const service = createEquipmentService(supabase);
    const equipment = await service.getById(id);

    if (!equipment) return notFoundResponse("Equipment not found");

    const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/equipment/qr/${equipment.qr_code_token}`;
    const pngBuffer = await QRCode.toBuffer(qrUrl, { type: "png", width: 400, margin: 2 });

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${equipment.internal_code}-qr.png"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
