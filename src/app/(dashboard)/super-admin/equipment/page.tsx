import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { forbidden, redirect } from "next/navigation";
import { SAEquipmentClient } from "@/components/sa/sa-equipment-client";

export default async function SAEquipmentPage({
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
    .from("equipment")
    .select(
      "id,internal_code,name,brand,model,status,location,next_calibration, category:equipment_categories(name), company:companies(id,name)"
    );

  let countQuery = supabase
    .from("equipment")
    .select("id", { count: "exact", head: true });

  if (search) {
    const filter = `name.ilike.%${search}%,internal_code.ilike.%${search}%`;
    dataQuery = dataQuery.or(filter);
    countQuery = countQuery.or(filter);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Equipamentos</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{total} equipamentos em todas as empresas</p>
        </div>
      </div>
      <SAEquipmentClient
        equipment={(data ?? []) as any[]}
        companies={companies ?? []}
        totalPages={totalPages}
        page={page}
        search={search}
        total={total}
      />
    </div>
  );
}
