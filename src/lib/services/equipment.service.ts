import type { SupabaseClient } from "@supabase/supabase-js";
import { createEquipmentRepository } from "@/lib/repositories/equipment.repository";
import { createAuditService } from "@/lib/services/audit.service";
import type { Equipment } from "@/types";
import type { CreateEquipmentInput, UpdateEquipmentInput, EquipmentFilterInput } from "@/lib/validations/equipment.schemas";
import type { PaginatedResponse } from "@/types";

export class EquipmentService {
  constructor(private supabase: SupabaseClient) {}

  async list(companyId: string, filters: EquipmentFilterInput): Promise<PaginatedResponse<Equipment>> {
    const repo = createEquipmentRepository(this.supabase);
    const { data, count } = await repo.findFiltered(companyId, filters);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    return {
      data,
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit),
      },
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

  async create(companyId: string, userId: string, input: CreateEquipmentInput): Promise<Equipment> {
    const repo = createEquipmentRepository(this.supabase);
    const audit = createAuditService(this.supabase);

    const equipment = await repo.create({
      ...input,
      company_id: companyId,
      qr_code_token: crypto.randomUUID(),
    } as Omit<Equipment, "id" | "created_at" | "updated_at">);

    await Promise.all([
      repo.addHistory(equipment.id, userId, "created", `Equipamento "${equipment.name}" criado`),
      audit.log({ companyId, userId, action: "create", resourceType: "equipment", resourceId: equipment.id, resourceName: equipment.name, newData: input as Record<string, unknown> }),
    ]);

    return equipment;
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
    await repo.delete(id);
    await audit.log({ companyId, userId, action: "delete", resourceType: "equipment", resourceId: id, resourceName: before?.name, oldData: before as unknown as Record<string, unknown> });
  }
}

export function createEquipmentService(supabase: SupabaseClient) {
  return new EquipmentService(supabase);
}
