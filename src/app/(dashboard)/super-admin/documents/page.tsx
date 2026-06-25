import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { forbidden, redirect } from "next/navigation";
import { SADocumentsClient } from "@/components/sa/sa-documents-client";

export default async function SADocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") forbidden();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const search = sp.search ?? "";
  const limit = 25;

  const supabase = createSupabaseAdminClient();

  let dataQuery = supabase
    .from("documents")
    .select(
      "id,name,file_size,version,created_at, company:companies(name), uploader:profiles!documents_uploaded_by_fkey(name)"
    );

  let countQuery = supabase
    .from("documents")
    .select("id", { count: "exact", head: true });

  if (search) {
    dataQuery = dataQuery.ilike("name", `%${search}%`);
    countQuery = countQuery.ilike("name", `%${search}%`);
  }

  const [
    { data, error },
    { count, error: countError },
    { data: companies },
  ] = await Promise.all([
    dataQuery.order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1),
    countQuery,
    supabase.from("companies").select("id,name").order("name"),
  ]);

  if (error) throw new Error(error.message);
  if (countError) throw new Error(countError.message);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 lg:p-7 flex flex-col gap-5">
      <div>
        <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Documentos</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">{total} documentos em todas as empresas</p>
      </div>
      <SADocumentsClient
        documents={(data ?? []) as any[]}
        companies={companies ?? []}
        totalPages={totalPages}
        page={page}
        search={search}
        total={total}
      />
    </div>
  );
}
