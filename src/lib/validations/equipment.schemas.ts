import { z } from "zod";
import { paginationSchema } from "./common.schemas";

const EQUIPMENT_STATUSES = ["active", "inactive", "under_maintenance", "calibration", "retired"] as const;

const CALIBRATION_PERIODICITIES = ["semestral", "anual", "bi_anual", "tri_anual", "outro"] as const;

export const createEquipmentSchema = z.object({
  company_id: z.string().uuid().optional(),
  internal_code: z.string().min(1, "Internal code is required").max(50),
  name: z.string().min(2, "Name is required").max(200),
  category_id: z.string().uuid().nullable().optional(),
  category_name: z.string().max(100).nullable().optional(),
  brand: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  serial_number: z.string().max(100).nullable().optional(),
  tag: z.string().max(100).nullable().optional(),
  scale: z.string().max(100).nullable().optional(),
  status: z.enum(EQUIPMENT_STATUSES).optional().default("active"),
  location: z.string().max(200).nullable().optional(),
  acquisition_date: z.string().date().nullable().optional(),
  acquisition_cost: z.number().nonnegative().nullable().optional(),
  last_calibration: z.string().date().nullable().optional(),
  next_calibration: z.string().date().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  requires_calibration: z.boolean().optional().default(true),
  calibration_periodicity: z.enum(CALIBRATION_PERIODICITIES).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
});

export const updateEquipmentSchema = createEquipmentSchema.partial();

export const equipmentFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(EQUIPMENT_STATUSES).optional(),
  category_id: z.string().uuid().optional(),
  sort: z.enum(["name", "internal_code", "status", "updated_at"]).optional().default("updated_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type CreateEquipmentInput = z.input<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type EquipmentFilterInput = z.infer<typeof equipmentFilterSchema>;
