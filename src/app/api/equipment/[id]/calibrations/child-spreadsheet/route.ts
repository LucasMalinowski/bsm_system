import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/utils/errors";
import { unzip, zip, type Unzipped } from "fflate";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  template_doc_id: z.string().uuid(),
  performed_at: z.string().optional(),
});

const dec = new TextDecoder("utf-8");
const enc = new TextEncoder();

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function applyPlaceholders(content: string, placeholders: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.split(key).join(escapeXml(value));
  }
  return result;
}

function unzipAsync(data: Uint8Array): Promise<Unzipped> {
  return new Promise((resolve, reject) =>
    unzip(data, (err, files) => (err ? reject(err) : resolve(files)))
  );
}

function zipAsync(files: Unzipped): Promise<Uint8Array> {
  return new Promise((resolve, reject) =>
    zip(files, { level: 6 }, (err, data) => (err ? reject(err) : resolve(data)))
  );
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: equipmentId } = await params;
    const user = await getServerSession();
    if (!user) return unauthorizedResponse();
    if (!isSuperAdmin(user)) return forbiddenResponse();

    const body = await request.json();
    const { template_doc_id, performed_at } = schema.parse(body);

    const supabase = createSupabaseAdminClient();

    const [{ data: equipment }, { data: templateDoc }] = await Promise.all([
      supabase
        .from("equipment")
        .select("name, internal_code, company_id, calibration_periodicity, brand, model, serial_number, tag, scale, equipment_calibration_points(*)")
        .eq("id", equipmentId)
        .single(),
      supabase
        .from("calibration_documents")
        .select("storage_path, name")
        .eq("id", template_doc_id)
        .single(),
    ]);

    if (!equipment || !templateDoc) {
      return NextResponse.json({ error: "Equipamento ou template não encontrado" }, { status: 404 });
    }

    const [{ data: company }, { data: fileData, error: dlError }] = await Promise.all([
      supabase.from("companies").select("name, cnpj").eq("id", equipment.company_id).single(),
      supabase.storage.from("calibration-docs").download(templateDoc.storage_path),
    ]);

    if (dlError || !fileData) throw new Error("Falha ao baixar template: " + dlError?.message);

    const calibDate = performed_at ?? new Date().toISOString().split("T")[0];
    const points = (equipment.equipment_calibration_points ?? []) as Array<{
      point_value: string; criterion: string; error_tolerance: number | null;
    }>;

    const placeholders: Record<string, string> = {
      "{{nome_equipamento}}": equipment.name,
      "{{codigo_interno}}": equipment.internal_code,
      "{{nome_empresa}}": company?.name ?? "",
      "{{data_calibracao}}": calibDate,
      "{{periodicidade}}": equipment.calibration_periodicity ?? "",
      "{{marca}}": equipment.brand ?? "",
      "{{modelo}}": equipment.model ?? "",
      "{{numero_serie}}": equipment.serial_number ?? "",
      "{{tag}}": equipment.tag ?? "",
      "{{escala}}": equipment.scale ?? "",
      "{{cnpj_empresa}}": company?.cnpj ?? "",
    };
    points.forEach((p, i) => {
      placeholders[`{{ponto_${i + 1}_valor}}`] = p.point_value;
      placeholders[`{{ponto_${i + 1}_criterio}}`] = p.criterion;
      placeholders[`{{ponto_${i + 1}_erro}}`] = p.error_tolerance?.toString() ?? "";
    });

    // Decompress the XLSX (which is a ZIP archive) using fflate.
    // fflate is pure-JS, works on Vercel/Edge, and doesn't add unwanted
    // directory entries like JSZip does.
    const rawBuffer = new Uint8Array(await fileData.arrayBuffer());
    const files = await unzipAsync(rawBuffer);

    // Patch only XML files that may contain placeholder strings.
    // Everything else (styles, images, drawings, binary files) passes through untouched.
    for (const path of Object.keys(files)) {
      if (
        (path === "xl/sharedStrings.xml" ||
          path.startsWith("xl/worksheets/") ||
          path.startsWith("xl/charts/")) &&
        path.endsWith(".xml")
      ) {
        const original = dec.decode(files[path]);
        const patched = applyPlaceholders(original, placeholders);
        if (patched !== original) {
          files[path] = enc.encode(patched);
        }
      }
    }

    // Rebuild with [Content_Types].xml first — required by the OPC spec.
    // fflate preserves object insertion order, so we just put it at the front.
    const contentTypes = files["[Content_Types].xml"];
    if (contentTypes) {
      delete files["[Content_Types].xml"];
      const ordered: Unzipped = { "[Content_Types].xml": contentTypes, ...files };
      const outputBuffer = await zipAsync(ordered);

      const dateStr = calibDate.replace(/-/g, "");
      const safeName = `${company?.name ?? "BSM"} - ${equipment.internal_code} - ${dateStr}.xlsx`
        .replace(/[^a-zA-Z0-9\-_.À-ÿ ]/g, "")
        .trim();
      const storagePath = `records/${equipmentId}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("calibration-records")
        .upload(storagePath, outputBuffer, {
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

      if (uploadError) throw new Error(uploadError.message);

      return NextResponse.json({ data: { storage_path: storagePath, file_name: safeName } }, { status: 201 });
    }

    throw new Error("Template inválido: [Content_Types].xml não encontrado no arquivo");
  } catch (err) {
    return handleApiError(err);
  }
}
