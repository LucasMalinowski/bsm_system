import type { SupabaseClient } from "@supabase/supabase-js";
import { createDocumentRepository } from "@/lib/repositories/document.repository";
import { createAuditService } from "@/lib/services/audit.service";
import type { Document, PaginatedResponse } from "@/types";
import type { UploadDocumentInput, UpdateDocumentInput, DocumentFilterInput } from "@/lib/validations/document.schemas";

export class DocumentService {
  constructor(private supabase: SupabaseClient) {}

  async list(companyId: string, filters: DocumentFilterInput): Promise<PaginatedResponse<Document>> {
    const repo = createDocumentRepository(this.supabase);
    const { data, count } = await repo.findFiltered(companyId, filters);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    return {
      data,
      pagination: { page, limit, total: count, total_pages: Math.ceil(count / limit) },
    };
  }

  async getById(id: string) {
    const repo = createDocumentRepository(this.supabase);
    return repo.findWithVersions(id);
  }

  async upload(
    companyId: string,
    userId: string,
    file: File,
    input: UploadDocumentInput
  ): Promise<Document> {
    const ext = file.name.split(".").pop() ?? "bin";
    const storagePath = `${companyId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await this.supabase.storage
      .from("documents")
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const repo = createDocumentRepository(this.supabase);
    const audit = createAuditService(this.supabase);

    const doc = await repo.create({
      ...input,
      company_id: companyId,
      uploaded_by: userId,
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
      version: 1,
    } as Omit<Document, "id" | "created_at" | "updated_at">);

    await Promise.all([
      this.supabase.from("document_versions").insert({
        document_id: doc.id,
        version: 1,
        storage_path: storagePath,
        file_size: file.size,
        uploaded_by: userId,
        notes: "Initial version",
      }),
      audit.log({
        companyId,
        userId,
        action: "create",
        resourceType: "document",
        resourceId: doc.id,
        resourceName: doc.name,
        newData: input as Record<string, unknown>,
      }),
    ]);

    return doc;
  }

  async update(id: string, userId: string, input: UpdateDocumentInput): Promise<Document> {
    const repo = createDocumentRepository(this.supabase);
    const audit = createAuditService(this.supabase);
    const before = await repo.findById(id);
    const doc = await repo.update(id, input);

    await audit.log({
      companyId: doc.company_id,
      userId,
      action: "update",
      resourceType: "document",
      resourceId: id,
      resourceName: doc.name,
      oldData: before as unknown as Record<string, unknown>,
      newData: input as Record<string, unknown>,
    });

    return doc;
  }

  async getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, expiresIn);

    if (error) throw new Error(error.message);
    return data.signedUrl;
  }

  async delete(id: string, userId: string, companyId: string): Promise<void> {
    const repo = createDocumentRepository(this.supabase);
    const audit = createAuditService(this.supabase);
    const doc = await repo.findById(id);

    if (doc) {
      await this.supabase.storage.from("documents").remove([doc.storage_path]);
    }

    await Promise.all([
      repo.delete(id),
      audit.log({
        companyId,
        userId,
        action: "delete",
        resourceType: "document",
        resourceId: id,
        resourceName: doc?.name,
        oldData: doc as unknown as Record<string, unknown>,
      }),
    ]);
  }
}

export function createDocumentService(supabase: SupabaseClient) {
  return new DocumentService(supabase);
}
