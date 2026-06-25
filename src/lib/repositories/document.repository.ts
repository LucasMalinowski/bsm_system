import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base.repository";
import type { Document, DocumentVersion } from "@/types";
import type { DocumentFilterInput } from "@/lib/validations/document.schemas";

export class DocumentRepository extends BaseRepository<Document> {
  protected tableName = "documents";

  async findFiltered(
    companyId: string,
    filters: DocumentFilterInput,
    employeeOnly = false
  ): Promise<{ data: Document[]; count: number }> {
    const { page = 1, limit = 20, search, category_id, equipment_id, sort = "updated_at", order = "desc" } = filters;

    let query = this.supabase
      .from("documents")
      .select(`
        *,
        category:document_categories(id,name),
        uploader:profiles!documents_uploaded_by_fkey(name),
        equipment:equipment(name,internal_code)
      `, { count: "exact" })
      .eq("company_id", companyId);

    if (employeeOnly) query = query.eq("visible_to_employees", true);
    if (search) query = query.ilike("name", `%${search}%`);
    if (category_id) query = query.eq("category_id", category_id);
    if (equipment_id) query = query.eq("equipment_id", equipment_id);

    const { data, error, count } = await query
      .order(sort, { ascending: order === "asc" })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new Error(error.message);
    return { data: (data ?? []) as Document[], count: count ?? 0 };
  }

  async findWithVersions(id: string): Promise<(Document & { versions: DocumentVersion[] }) | null> {
    const { data: doc, error } = await this.supabase
      .from("documents")
      .select(`
        *,
        category:document_categories(id,name),
        uploader:profiles!documents_uploaded_by_fkey(name),
        equipment:equipment(name,internal_code)
      `)
      .eq("id", id)
      .single();

    if (error) return null;

    const { data: versions } = await this.supabase
      .from("document_versions")
      .select("*, uploader:profiles(name)")
      .eq("document_id", id)
      .order("version", { ascending: false });

    return { ...(doc as Document), versions: (versions ?? []) as DocumentVersion[] };
  }
}

export function createDocumentRepository(supabase: SupabaseClient) {
  return new DocumentRepository(supabase);
}
