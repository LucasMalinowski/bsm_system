export interface CalibrationDocument {
  id: string;
  name: string;
  description: string | null;
  storage_path: string;
  current_version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: { name: string };
  versions?: CalibrationDocumentVersion[];
}

export interface CalibrationDocumentVersion {
  id: string;
  document_id: string;
  version: number;
  storage_path: string;
  file_size: number;
  notes: string | null;
  uploaded_by: string;
  created_at: string;
  uploader?: { name: string };
}

export interface CalibrationPoint {
  id: string;
  equipment_id: string;
  point_value: string;
  criterion: string;
  error_tolerance: number | null;
  sort_order: number;
  created_at: string;
}

export interface CalibrationRecord {
  id: string;
  equipment_id: string;
  company_id: string;
  performed_by: string;
  template_doc_id: string | null;
  child_storage_path: string | null;
  certificate_storage_path: string | null;
  performed_at: string;
  notes: string | null;
  created_at: string;
  performer?: { name: string };
  template_doc?: { name: string } | null;
}

export interface CreateCalibrationDocumentDTO {
  name: string;
  description?: string | null;
}

export interface CreateCalibrationPointDTO {
  point_value: string;
  criterion: string;
  error_tolerance?: number | null;
  sort_order?: number;
}

export interface CreateCalibrationRecordDTO {
  template_doc_id?: string | null;
  performed_at?: string;
  notes?: string | null;
}
