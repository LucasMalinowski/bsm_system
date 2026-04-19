import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEquipmentService } from "@/lib/services/equipment.service";
import { equipmentFilterSchema } from "@/lib/validations/equipment.schemas";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { EquipmentStatusBadge } from "@/components/equipment/equipment-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { QrCode, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!can(user, PERMISSIONS.EQUIPMENT_READ)) redirect("/dashboard");
  if (!user.company_id) redirect("/super-admin/companies");

  const params = await searchParams;
  const filters = equipmentFilterSchema.parse(params);

  const supabase = await createSupabaseServerClient();
  const service = createEquipmentService(supabase);
  const result = await service.list(user.company_id, filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipamentos</h1>
          <p className="text-sm text-gray-500">{result.pagination.total} equipamentos cadastrados</p>
        </div>
        {can(user, PERMISSIONS.EQUIPMENT_CREATE) && (
          <Link href="/equipment/new">
            <Button>
              <Plus className="h-4 w-4" />
              Novo Equipamento
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Código</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Localização</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Próx. Calibração</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">QR</th>
              </tr>
            </thead>
            <tbody>
              {result.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Nenhum equipamento encontrado
                  </td>
                </tr>
              ) : (
                result.data.map((eq) => (
                  <tr key={eq.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{eq.internal_code}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/equipment/${eq.id}`}
                        className="font-medium text-[var(--brand-primary)] hover:underline"
                      >
                        {eq.name}
                      </Link>
                      {eq.brand && <p className="text-xs text-gray-400">{eq.brand} {eq.model}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{eq.category?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <EquipmentStatusBadge status={eq.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{eq.location ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(eq.next_calibration)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/api/equipment/${eq.id}/qrcode`}
                        target="_blank"
                        className="text-gray-400 hover:text-[var(--brand-primary)]"
                        title="Download QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {result.pagination.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <p className="text-sm text-gray-500">
                Página {result.pagination.page} de {result.pagination.total_pages}
              </p>
              <div className="flex gap-2">
                {result.pagination.page > 1 && (
                  <Link href={`?page=${result.pagination.page - 1}`}>
                    <Button variant="outline" size="sm">Anterior</Button>
                  </Link>
                )}
                {result.pagination.page < result.pagination.total_pages && (
                  <Link href={`?page=${result.pagination.page + 1}`}>
                    <Button variant="outline" size="sm">Próxima</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
