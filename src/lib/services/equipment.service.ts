import type { SupabaseClient } from "@supabase/supabase-js";
import { createEquipmentRepository } from "@/lib/repositories/equipment.repository";
import { createAuditService } from "@/lib/services/audit.service";
import { createNotificationService } from "@/lib/services/notification.service";
import type { Equipment } from "@/types";
import type { CreateEquipmentInput, UpdateEquipmentInput, EquipmentFilterInput } from "@/lib/validations/equipment.schemas";
import type { PaginatedResponse } from "@/types";

export class EquipmentService {
  constructor(private supabase: SupabaseClient) {}

  async list(companyId: string | null, filters: EquipmentFilterInput): Promise<PaginatedResponse<Equipment>> {
    const repo = createEquipmentRepository(this.supabase);
    const { data, count } = await repo.findFiltered(companyId, filters);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    return {
      data,
      pagination: { page, limit, total: count, total_pages: Math.ceil(count / limit) },
    };
  }

  async getById(id: string): Promise<Equipment | null> {
    const repo = createEquipmentRepository(this.supabase);
    return repo.findById(id);
  }

  async getWithHistory(id: string) {
    const repo = createEquipmentRepository(this.supabase);
    return repo.findWithHistory(id);
  }

  async getByQRToken(token: string): Promise<Equipment | null> {
    const repo = createEquipmentRepository(this.supabase);
    return repo.findByQRToken(token);
  }

  async findByModel(model: string, companyId: string): Promise<Equipment[]> {
    const { data } = await this.supabase
      .from("equipment")
      .select("id, name, model, internal_code")
      .eq("company_id", companyId)
      .eq("model", model)
      .limit(10);
    return (data ?? []) as Equipment[];
  }

  async getDocumentsByModel(model: string, companyId: string): Promise<Array<{ id: string; name: string; storage_path: string; mime_type: string; file_size: number }>> {
    const { data: equipList } = await this.supabase
      .from("equipment")
      .select("id")
      .eq("company_id", companyId)
      .eq("model", model);

    if (!equipList || equipList.length === 0) return [];

    const ids = equipList.map((e: { id: string }) => e.id);
    const { data: docs } = await this.supabase
      .from("documents")
      .select("id, name, storage_path, mime_type, file_size, equipment_id")
      .in("equipment_id", ids);

    return (docs ?? []) as Array<{ id: string; name: string; storage_path: string; mime_type: string; file_size: number }>;
  }

  async create(companyId: string, userId: string, input: CreateEquipmentInput): Promise<Equipment> {
    const repo = createEquipmentRepository(this.supabase);
    const audit = createAuditService(this.supabase);
    const notif = createNotificationService(this.supabase);

    const equipment = await repo.create({
      ...input,
      company_id: companyId,
      qr_code_token: crypto.randomUUID(),
    } as Omit<Equipment, "id" | "created_at" | "updated_at">);

    await Promise.all([
      repo.addHistory(equipment.id, userId, "created", `Equipamento "${equipment.name}" criado`),
      audit.log({ companyId, userId, action: "create", resourceType: "equipment", resourceId: equipment.id, resourceName: equipment.name, newData: input as Record<string, unknown> }),
    ]);

    await notif.notifyAdminsOfEquipment(companyId, equipment.name, equipment.id).catch(console.error);

    return equipment;
  }

  async copyDocumentsFromModel(newEquipmentId: string, sourceEquipmentIds: string[], userId: string, companyId: string): Promise<void> {
    if (sourceEquipmentIds.length === 0) return;

    const { data: docs } = await this.supabase
      .from("documents")
      .select("*")
      .in("equipment_id", sourceEquipmentIds);

    if (!docs || docs.length === 0) return;

    const copies = docs.map((d: Record<string, unknown>) => ({
      company_id: companyId,
      category_id: d.category_id,
      equipment_id: newEquipmentId,
      name: d.name,
      description: d.description,
      storage_path: d.storage_path,
      mime_type: d.mime_type,
      file_size: d.file_size,
      version: 1,
      uploaded_by: userId,
      visible_to_employees: d.visible_to_employees ?? false,
    }));

    await this.supabase.from("documents").insert(copies);
  }

  async update(id: string, userId: string, input: UpdateEquipmentInput): Promise<Equipment> {
    const repo = createEquipmentRepository(this.supabase);
    const audit = createAuditService(this.supabase);
    const before = await repo.findById(id);
    const equipment = await repo.update(id, input);

    await Promise.all([
      repo.addHistory(id, userId, "updated", `Equipamento atualizado`, input as Record<string, unknown>),
      audit.log({ companyId: equipment.company_id, userId, action: "update", resourceType: "equipment", resourceId: id, resourceName: equipment.name, oldData: before as unknown as Record<string, unknown>, newData: input as Record<string, unknown> }),
    ]);

    return equipment;
  }

  async changeStatus(id: string, userId: string, status: Equipment["status"]): Promise<Equipment> {
    const repo = createEquipmentRepository(this.supabase);
    const audit = createAuditService(this.supabase);
    const before = await repo.findById(id);
    const equipment = await repo.update(id, { status });

    await Promise.all([
      repo.addHistory(id, userId, "status_changed", `Status alterado para "${status}"`),
      audit.log({ companyId: equipment.company_id, userId, action: "update", resourceType: "equipment", resourceId: id, resourceName: equipment.name, oldData: { status: before?.status }, newData: { status } }),
    ]);

    return equipment;
  }

  async delete(id: string, userId: string, companyId: string): Promise<void> {
    const repo = createEquipmentRepository(this.supabase);
    const audit = createAuditService(this.supabase);
    const before = await repo.findById(id);
    await repo.softDelete(id);
    await audit.log({ companyId, userId, action: "delete", resourceType: "equipment", resourceId: id, resourceName: before?.name, oldData: before as unknown as Record<string, unknown> });
  }
}

export function createEquipmentService(supabase: SupabaseClient) {
  return new EquipmentService(supabase);
}
