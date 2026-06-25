import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { forbidden, redirect } from "next/navigation";
import { SATicketsClient } from "@/components/sa/sa-tickets-client";

export default async function SATicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string; support?: string }>;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") forbidden();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const search = sp.search ?? "";
  const status = sp.status ?? "";
  const supportOnly = sp.support === "1";
  const limit = 25;

  const supabase = createSupabaseAdminClient();

  let dataQuery = supabase
    .from("tickets")
    .select(
      `id,title,status,priority,updated_at,is_support_request,
      company:companies(name),
      equipment:equipment(name),
      assignee:profiles!tickets_assigned_to_fkey(name)`
    );

  let countQuery = supabase
    .from("tickets")
    .select("id", { count: "exact", head: true });

  if (search) {
    dataQuery = dataQuery.ilike("title", `%${search}%`);
    countQuery = countQuery.ilike("title", `%${search}%`);
  }
  if (status) {
    dataQuery = dataQuery.eq("status", status);
    countQuery = countQuery.eq("status", status);
  }
  if (supportOnly) {
    dataQuery = dataQuery.eq("is_support_request", true);
    countQuery = countQuery.eq("is_support_request", true);
  }

  const [
    { data, error },
    { count, error: countError },
    { data: companies },
  ] = await Promise.all([
    dataQuery.order("updated_at", { ascending: false }).range((page - 1) * limit, page * limit - 1),
    countQuery,
    supabase.from("companies").select("id,name").order("name"),
  ]);

  if (error) throw new Error(error.message);
  if (countError) throw new Error(countError.message);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 lg:p-7 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Chamados</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{total} chamados em todas as empresas</p>
        </div>
      </div>
      <SATicketsClient
        tickets={(data ?? []) as any[]}
        companies={companies ?? []}
        totalPages={totalPages}
        page={page}
        search={search}
        status={status}
        supportOnly={supportOnly}
        total={total}
      />
    </div>
  );
}
