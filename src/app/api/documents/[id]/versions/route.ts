import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDocumentRepository } from "@/lib/repositories/document.repository";
import { createAuditService } from "@/lib/services/audit.service";
import { can, PERMISSIONS, isSuperAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/utils/errors";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isSuperAdmin(user)) return forbiddenResponse();

    const supabase = await createSupabaseServerClient();
    const repo = createDocumentRepository(supabase);
    const audit = createAuditService(supabase);

    const doc = await repo.findById(id);
    if (!doc) return notFoundResponse("Document not found");
    if (!isSuperAdmin(user) && doc.company_id !== user.company_id) return notFoundResponse("Document not found");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const notes = formData.get("notes") as string | null;

    if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 });

    const ext = file.name.split(".").pop() ?? "bin";
    const newVersion = doc.version + 1;
    const storagePath = `${doc.company_id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    await supabase.from("document_versions").insert({
      document_id: id,
      version: newVersion,
      storage_path: storagePath,
      file_size: file.size,
      uploaded_by: user.id,
      notes: notes || null,
    });

    const { data: updated, error: updateError } = await supabase
      .from("documents")
      .update({ version: newVersion, storage_path: storagePath, file_size: file.size, mime_type: file.type })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    await audit.log({
      companyId: doc.company_id,
      userId: user.id,
      action: "update",
      resourceType: "document",
      resourceId: id,
      resourceName: doc.name,
      oldData: { version: doc.version },
      newData: { version: newVersion, notes },
    });

    return NextResponse.json({ data: updated }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
