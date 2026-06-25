export type EquipmentStatus =
  | "active"
  | "inactive"
  | "under_maintenance"
  | "calibration"
  | "retired";

export interface EquipmentCategory {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export type CalibrationPeriodicity =
  | "semestral"
  | "anual"
  | "bi_anual"
  | "tri_anual"
  | "outro";

export interface Equipment {
  id: string;
  company_id: string;
  category_id: string | null;
  internal_code: string;
  name: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  tag: string | null;
  scale: string | null;
  status: EquipmentStatus;
  location: string | null;
  acquisition_date: string | null;
  last_calibration: string | null;
  next_calibration: string | null;
  notes: string | null;
  qr_code_token: string;
  image_url: string | null;
  requires_calibration: boolean;
  calibration_periodicity: CalibrationPeriodicity | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  category?: EquipmentCategory;
}

export interface EquipmentHistory {
  id: string;
  equipment_id: string;
  user_id: string;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user?: { name: string };
}

export interface CreateEquipmentDTO {
  category_id?: string | null;
  internal_code: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  tag?: string | null;
  scale?: string | null;
  status?: EquipmentStatus;
  location?: string | null;
  acquisition_date?: string | null;
  last_calibration?: string | null;
  next_calibration?: string | null;
  notes?: string | null;
  image_url?: string | null;
  requires_calibration?: boolean;
  calibration_periodicity?: CalibrationPeriodicity | null;
}

export interface UpdateEquipmentDTO extends Partial<CreateEquipmentDTO> {}
