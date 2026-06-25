import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    // Equipment due for calibration within the next 7 days
    const { data: equipment, error: eqErr } = await supabase
      .from("equipment")
      .select("id, name, company_id, next_calibration")
      .eq("requires_calibration", true)
      .not("next_calibration", "is", null)
      .lte("next_calibration", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

    if (eqErr) throw eqErr;
    if (!equipment || equipment.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    // Group by company
    const byCompany: Record<string, typeof equipment> = {};
    for (const eq of equipment) {
      if (!eq.company_id) continue;
      (byCompany[eq.company_id] ??= []).push(eq);
    }

    // Find company admins to notify
    const companyIds = Object.keys(byCompany);
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, company_id")
      .in("company_id", companyIds)
      .eq("role", "admin")
      .eq("is_active", true);

    if (!admins || admins.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    // Check user notification preferences — skip users who disabled cal_alert
    const adminIds = admins.map((a) => a.id);
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id, cal_alert")
      .in("user_id", adminIds);

    const disabledSet = new Set(
      (prefs ?? []).filter((p) => p.cal_alert === false).map((p) => p.user_id)
    );

    const notifications: {
      user_id: string;
      type: string;
      title: string;
      body: string;
      metadata: Record<string, unknown>;
    }[] = [];

    for (const admin of admins) {
      if (disabledSet.has(admin.id)) continue;
      const items = byCompany[admin.company_id!] ?? [];
      if (items.length === 0) continue;

      const names = items.map((e) => e.name).slice(0, 3).join(", ");
      const more = items.length > 3 ? ` e mais ${items.length - 3}` : "";
      notifications.push({
        user_id: admin.id,
        type: "calibration_due",
        title: "Calibração próxima do vencimento",
        body: `${names}${more} vencem nos próximos 7 dias.`,
        metadata: { equipment_ids: items.map((e) => e.id) },
      });
    }

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }

    return NextResponse.json({ sent: notifications.length });
  } catch (err) {
    console.error("[cron/calibration-due]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
