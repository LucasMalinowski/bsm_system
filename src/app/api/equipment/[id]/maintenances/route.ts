import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin, isSuperAdmin, can, PERMISSIONS } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const createMaintenanceSchema = z.object({
  performed_at: z.string().min(1, "Data é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  cost: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
  performed_by: z.string().uuid().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: equipmentId } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!can(user, PERMISSIONS.EQUIPMENT_READ)) return forbiddenResponse();

    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("maintenance_records")
      .select("id, performed_at, description, cost, notes, created_at, performed_by, profiles:performed_by(name)")
      .eq("equipment_id", equipmentId)
      .order("performed_at", { ascending: false });

    if (!isSuperAdmin(user)) {
      query = query.eq("company_id", user.company_id!);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: equipmentId } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isAdmin(user)) return forbiddenResponse();

    const body = await request.json();
    const input = createMaintenanceSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    // Resolve company_id for this equipment
    const { data: eq, error: eqErr } = await supabase
      .from("equipment")
      .select("company_id")
      .eq("id", equipmentId)
      .single();

    if (eqErr || !eq) return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
    if (!isSuperAdmin(user) && eq.company_id !== user.company_id) {
      return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("maintenance_records")
      .insert({
        equipment_id: equipmentId,
        company_id: eq.company_id,
        performed_by: input.performed_by ?? user.id,
        performed_at: input.performed_at,
        description: input.description,
        cost: input.cost ?? null,
        notes: input.notes ?? null,
      })
      .select("id, performed_at, description, cost, notes, created_at, performed_by, profiles:performed_by(name)")
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
