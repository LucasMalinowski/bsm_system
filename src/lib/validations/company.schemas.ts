import { z } from "zod";
import { hexColorSchema } from "./common.schemas";

export const companyThemeSchema = z.object({
  primary_color: hexColorSchema,
  secondary_color: hexColorSchema,
  accent_color: hexColorSchema.optional(),
  logo_url: z.string().url().nullable().optional(),
});

export const createCompanySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only"),
  primary_color: hexColorSchema.default("#0363a9"),
  secondary_color: hexColorSchema.default("#008adb"),
  accent_color: hexColorSchema.default("#e0f0fb"),
  admin_email: z.string().email("Invalid admin email"),
  admin_name: z.string().min(2, "Admin name too short"),
});

export const updateCompanySchema = z.object({
  name: z.string().min(2).optional(),
  logo_url: z.string().url().nullable().optional(),
  primary_color: hexColorSchema.optional(),
  secondary_color: hexColorSchema.optional(),
  accent_color: hexColorSchema.optional(),
});

export type CreateCompanyInput = z.input<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CompanyThemeInput = z.infer<typeof companyThemeSchema>;
