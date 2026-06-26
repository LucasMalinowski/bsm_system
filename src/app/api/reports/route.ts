import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin, isAdmin } from "@/lib/auth/permissions";

export async function GET(req: NextRequest) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user) && !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const companyIdParam = searchParams.get("company_id");

  // Determine which company to scope data to
  let companyId: string | null = null;
  if (isSuperAdmin(user)) {
    companyId = companyIdParam ?? null; // null = all companies aggregate
  } else {
    companyId = user.company_id; // admin always scoped to their company
  }

  const from = fromParam ? new Date(fromParam).toISOString() : null;
  const to = toParam ? new Date(toParam + "T23:59:59Z").toISOString() : null;

  const admin = createSupabaseAdminClient();

  // ── 1. Spending ───────────────────────────────────────────────────────────
  let eqQuery = admin.from("equipment").select("id,name,acquisition_cost,company_id");
  if (companyId) eqQuery = eqQuery.eq("company_id", companyId);
  const { data: equipment } = await eqQuery;

  let calQuery = admin.from("calibration_records").select("equipment_id,company_id,cost,performed_at");
  if (companyId) calQuery = calQuery.eq("company_id", companyId);
  if (from) calQuery = calQuery.gte("performed_at", from);
  if (to) calQuery = calQuery.lte("performed_at", to);
  const { data: calibrations } = await calQuery;

  let maintQuery = admin.from("maintenance_records").select("equipment_id,company_id,cost,performed_at");
  if (companyId) maintQuery = maintQuery.eq("company_id", companyId);
  if (from) maintQuery = maintQuery.gte("performed_at", from);
  if (to) maintQuery = maintQuery.lte("performed_at", to);
  const { data: maintenances } = await maintQuery;

  const totalEquipCost = (equipment ?? []).reduce((s, e) => s + (e.acquisition_cost ?? 0), 0);
  const totalCalCost = (calibrations ?? []).reduce((s, c) => s + (c.cost ?? 0), 0);
  const totalMaintCost = (maintenances ?? []).reduce((s, m) => s + (m.cost ?? 0), 0);

  // Per-equipment spending table
  const spendingByEquip = (equipment ?? []).map((eq) => ({
    id: eq.id,
    name: eq.name,
    acquisition_cost: eq.acquisition_cost ?? 0,
    calibration_cost: (calibrations ?? []).filter((c) => c.equipment_id === eq.id).reduce((s, c) => s + (c.cost ?? 0), 0),
    maintenance_cost: (maintenances ?? []).filter((m) => m.equipment_id === eq.id).reduce((s, m) => s + (m.cost ?? 0), 0),
  }));

  // ── 2. Maintenance frequency ──────────────────────────────────────────────
  const maintByEquip = (equipment ?? []).map((eq) => {
    const records = (maintenances ?? []).filter((m) => m.equipment_id === eq.id);
    records.sort((a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime());
    const last = records[records.length - 1]?.performed_at ?? null;
    let avgInterval: number | null = null;
    if (records.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < records.length; i++) {
        gaps.push(
          (new Date(records[i].performed_at).getTime() - new Date(records[i - 1].performed_at).getTime()) /
            (1000 * 60 * 60 * 24)
        );
      }
      avgInterval = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    }
    return { id: eq.id, name: eq.name, total: records.length, last_maintenance: last, avg_interval_days: avgInterval };
  });

  // ── 3. Calibration compliance ─────────────────────────────────────────────
  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  let eqCalQuery = admin.from("equipment").select("id,name,calibration_periodicity_days,next_calibration_date,company_id");
  if (companyId) eqCalQuery = eqCalQuery.eq("company_id", companyId);
  const { data: equipForCal } = await eqCalQuery;

  const complianceRows = (equipForCal ?? []).map((eq) => {
    const next = eq.next_calibration_date ? new Date(eq.next_calibration_date) : null;
    let status: "overdue" | "upcoming" | "ok" | "no_schedule" = "no_schedule";
    if (next) {
      if (next < today) status = "overdue";
      else if (next <= in30Days) status = "upcoming";
      else status = "ok";
    }
    return {
      id: eq.id,
      name: eq.name,
      periodicity_days: eq.calibration_periodicity_days ?? null,
      next_calibration: eq.next_calibration_date ?? null,
      status,
    };
  });

  const totalScheduled = complianceRows.filter((r) => r.status !== "no_schedule").length;
  const overdue = complianceRows.filter((r) => r.status === "overdue").length;
  const upcoming = complianceRows.filter((r) => r.status === "upcoming").length;
  const ok = complianceRows.filter((r) => r.status === "ok").length;

  // ── 4. Tickets ────────────────────────────────────────────────────────────
  let ticketQuery = admin.from("tickets").select("id,status,type,priority,created_at,resolved_at,closed_at,picked_up_at,returned_at,company_id");
  if (companyId) ticketQuery = ticketQuery.eq("company_id", companyId);
  if (from) ticketQuery = ticketQuery.gte("created_at", from);
  if (to) ticketQuery = ticketQuery.lte("created_at", to);
  const { data: tickets } = await ticketQuery;

  const ticketList = tickets ?? [];
  const totalTickets = ticketList.length;

  const calcDays = (a: string, b: string | null) => {
    if (!b) return null;
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
  };

  const resolvedTickets = ticketList.filter((t) => t.resolved_at || t.closed_at);
  const avgResolutionDays =
    resolvedTickets.length > 0
      ? Math.round(
          resolvedTickets.reduce((s, t) => {
            const days = calcDays(t.created_at, t.resolved_at ?? t.closed_at) ?? 0;
            return s + days;
          }, 0) / resolvedTickets.length
        )
      : null;

  const openTickets = ticketList.filter((t) => !["resolved", "closed"].includes(t.status));
  const avgOpenDays =
    openTickets.length > 0
      ? Math.round(
          openTickets.reduce((s, t) => s + (calcDays(t.created_at, new Date().toISOString()) ?? 0), 0) /
            openTickets.length
        )
      : null;

  const byType = ticketList.reduce<Record<string, number>>((acc, t) => {
    acc[t.type] = (acc[t.type] ?? 0) + 1;
    return acc;
  }, {});

  const byPriority = ticketList.reduce<Record<string, number>>((acc, t) => {
    acc[t.priority] = (acc[t.priority] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    spending: {
      totals: { equipment: totalEquipCost, calibration: totalCalCost, maintenance: totalMaintCost },
      by_equipment: spendingByEquip,
    },
    maintenance: { by_equipment: maintByEquip },
    calibration: {
      totals: { total_scheduled: totalScheduled, overdue, upcoming, ok },
      by_equipment: complianceRows,
    },
    tickets: {
      totals: { total: totalTickets, avg_resolution_days: avgResolutionDays, avg_open_days: avgOpenDays },
      by_type: byType,
      by_priority: byPriority,
    },
  });
}
