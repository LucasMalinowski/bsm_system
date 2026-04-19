export interface DocumentCategory {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  company_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  storage_path: string;
  mime_type: string;
  file_size: number;
  version: number;
  equipment_id: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  category?: DocumentCategory;
  uploader?: { name: string };
  equipment?: { name: string; internal_code: string };
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  storage_path: string;
  file_size: number;
  uploaded_by: string;
  notes: string | null;
  created_at: string;
  uploader?: { name: string };
}

export interface UploadDocumentDTO {
  name: string;
  description?: string | null;
  category_id?: string | null;
  equipment_id?: string | null;
}

export interface UpdateDocumentDTO {
  name?: string;
  description?: string | null;
  category_id?: string | null;
  equipment_id?: string | null;
}
