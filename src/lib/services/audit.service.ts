import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction = "create" | "update" | "delete";
export type AuditResourceType =
  | "equipment"
  | "ticket"
  | "document"
  | "user"
  | "company";

export interface AuditLog {
  id: string;
  company_id: string | null;
  user_id: string | null;
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id: string | null;
  resource_name: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user?: { name: string } | null;
  company?: { name: string } | null;
}

export class AuditService {
  constructor(private supabase: SupabaseClient) {}

  async log(params: {
    companyId: string | null;
    userId: string;
    action: AuditAction;
    resourceType: AuditResourceType;
    resourceId?: string;
    resourceName?: string;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
  }): Promise<void> {
    await this.supabase.from("audit_logs").insert({
      company_id: params.companyId,
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId ?? null,
      resource_name: params.resourceName ?? null,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
    });
  }

  async list(filters: {
    companyId?: string;
    resourceType?: AuditResourceType;
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: AuditLog[]; count: number }> {
    const { companyId, resourceType, userId, page = 1, limit = 50 } = filters;

    let query = this.supabase
      .from("audit_logs")
      .select(
        "*, user:profiles(name), company:companies(name)",
        { count: "exact" }
      );

    if (companyId) query = query.eq("company_id", companyId);
    if (resourceType) query = query.eq("resource_type", resourceType);
    if (userId) query = query.eq("user_id", userId);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new Error(error.message);
    return { data: (data ?? []) as AuditLog[], count: count ?? 0 };
  }
}

export function createAuditService(supabase: SupabaseClient) {
  return new AuditService(supabase);
}
