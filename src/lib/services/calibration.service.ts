import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CalibrationDocument,
  CalibrationDocumentVersion,
  CalibrationPoint,
  CalibrationRecord,
  CreateCalibrationDocumentDTO,
  CreateCalibrationPointDTO,
  CreateCalibrationRecordDTO,
} from "@/types";

export class CalibrationService {
  constructor(private supabase: SupabaseClient) {}

  // ── Documents (SA templates) ──────────────────────────────────────────────

  async listDocuments(): Promise<CalibrationDocument[]> {
    const { data, error } = await this.supabase
      .from("calibration_documents")
      .select("*, creator:profiles(name), versions:calibration_document_versions(id,version,notes,file_size,created_at,uploader:profiles(name))")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as CalibrationDocument[];
  }

  async getDocument(id: string): Promise<CalibrationDocument | null> {
    const { data, error } = await this.supabase
      .from("calibration_documents")
      .select("*, creator:profiles(name), versions:calibration_document_versions(*, uploader:profiles(name))")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as CalibrationDocument;
  }

  async createDocument(userId: string, dto: CreateCalibrationDocumentDTO, storagePath: string): Promise<CalibrationDocument> {
    const { data, error } = await this.supabase
      .from("calibration_documents")
      .insert({
        name: dto.name,
        description: dto.description ?? null,
        storage_path: storagePath,
        current_version: 1,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await this.supabase.from("calibration_document_versions").insert({
      document_id: data.id,
      version: 1,
      storage_path: storagePath,
      file_size: 0,
      uploaded_by: userId,
      notes: "Versão inicial",
    });

    return data as CalibrationDocument;
  }

  async addVersion(docId: string, userId: string, storagePath: string, fileSize: number, notes?: string): Promise<CalibrationDocumentVersion> {
    const { data: doc } = await this.supabase
      .from("calibration_documents")
      .select("current_version")
      .eq("id", docId)
      .single();

    if (!doc) throw new Error("Document not found");

    const nextVersion = (doc.current_version ?? 1) + 1;

    const [{ data: version, error }] = await Promise.all([
      this.supabase
        .from("calibration_document_versions")
        .insert({
          document_id: docId,
          version: nextVersion,
          storage_path: storagePath,
          file_size: fileSize,
          uploaded_by: userId,
          notes: notes ?? null,
        })
        .select()
        .single(),
      this.supabase
        .from("calibration_documents")
        .update({ current_version: nextVersion, storage_path: storagePath })
        .eq("id", docId),
    ]);

    if (error) throw new Error(error.message);
    return version as CalibrationDocumentVersion;
  }

  // ── Calibration points per equipment ─────────────────────────────────────

  async listPoints(equipmentId: string): Promise<CalibrationPoint[]> {
    const { data, error } = await this.supabase
      .from("equipment_calibration_points")
      .select("*")
      .eq("equipment_id", equipmentId)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as CalibrationPoint[];
  }

  async savePoints(equipmentId: string, points: CreateCalibrationPointDTO[]): Promise<CalibrationPoint[]> {
    await this.supabase
      .from("equipment_calibration_points")
      .delete()
      .eq("equipment_id", equipmentId);

    if (points.length === 0) return [];

    const rows = points.map((p, i) => ({
      equipment_id: equipmentId,
      point_value: p.point_value,
      criterion: p.criterion,
      error_tolerance: p.error_tolerance ?? null,
      sort_order: p.sort_order ?? i,
    }));

    const { data, error } = await this.supabase
      .from("equipment_calibration_points")
      .insert(rows)
      .select();

    if (error) throw new Error(error.message);
    return (data ?? []) as CalibrationPoint[];
  }

  // ── Calibration records ───────────────────────────────────────────────────

  async listRecords(equipmentId: string): Promise<CalibrationRecord[]> {
    const { data, error } = await this.supabase
      .from("calibration_records")
      .select("*, performer:profiles(name), template_doc:calibration_documents(name)")
      .eq("equipment_id", equipmentId)
      .order("performed_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as CalibrationRecord[];
  }

  async createRecord(
    equipmentId: string,
    companyId: string,
    userId: string,
    dto: CreateCalibrationRecordDTO,
    childStoragePath?: string
  ): Promise<CalibrationRecord> {
    const { data, error } = await this.supabase
      .from("calibration_records")
      .insert({
        equipment_id: equipmentId,
        company_id: companyId,
        performed_by: userId,
        template_doc_id: dto.template_doc_id ?? null,
        child_storage_path: childStoragePath ?? null,
        performed_at: dto.performed_at ?? new Date().toISOString().split("T")[0],
        notes: dto.notes ?? null,
        cost: dto.cost ?? null,
      })
      .select("*, performer:profiles(name), template_doc:calibration_documents(name)")
      .single();

    if (error) throw new Error(error.message);
    return data as CalibrationRecord;
  }

  async attachCertificate(recordId: string, certificatePath: string): Promise<void> {
    const { error } = await this.supabase
      .from("calibration_records")
      .update({ certificate_storage_path: certificatePath })
      .eq("id", recordId);

    if (error) throw new Error(error.message);
  }
}

export function createCalibrationService(supabase: SupabaseClient) {
  return new CalibrationService(supabase);
}
