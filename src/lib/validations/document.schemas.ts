import { z } from "zod";
import { paginationSchema } from "./common.schemas";

export const uploadDocumentSchema = z.object({
  name: z.string().min(1, "Name is required").max(300),
  description: z.string().max(1000).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  equipment_id: z.string().uuid().nullable().optional(),
});

export const updateDocumentSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(1000).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  equipment_id: z.string().uuid().nullable().optional(),
  visible_to_employees: z.boolean().optional(),
});

export const documentFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  category_id: z.string().uuid().optional(),
  equipment_id: z.string().uuid().optional(),
  sort: z.enum(["name", "created_at", "updated_at"]).optional().default("updated_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentFilterInput = z.infer<typeof documentFilterSchema>;
