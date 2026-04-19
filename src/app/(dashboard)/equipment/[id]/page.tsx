import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEquipmentService } from "@/lib/services/equipment.service";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { redirect, notFound } from "next/navigation";
import { EquipmentStatusBadge } from "@/components/equipment/equipment-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import Link from "next/link";
import { ArrowLeft, QrCode } from "lucide-react";
import Image from "next/image";

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (!can(user, PERMISSIONS.EQUIPMENT_READ)) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const service = createEquipmentService(supabase);
  const equipment = await service.getWithHistory(id);

  if (!equipment) notFound();

  const qrUrl = `/api/equipment/${id}/qrcode`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/equipment" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{equipment.name}</h1>
          <p className="text-sm text-gray-500 font-mono">{equipment.internal_code}</p>
        </div>
        <EquipmentStatusBadge status={equipment.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Marca", equipment.brand],
                  ["Modelo", equipment.model],
                  ["Nº de Série", equipment.serial_number],
                  ["Localização", equipment.location],
                  ["Categoria", equipment.category?.name],
                  ["Data de Aquisição", formatDate(equipment.acquisition_date)],
                  ["Última Calibração", formatDate(equipment.last_calibration)],
                  ["Próxima Calibração", formatDate(equipment.next_calibration)],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="font-medium text-gray-500">{label}</dt>
                    <dd className="mt-1 text-gray-900">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
              {equipment.notes && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <dt className="text-sm font-medium text-gray-500">Observações</dt>
                  <dd className="mt-1 text-sm text-gray-900">{equipment.notes}</dd>
                </div>
              )}
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {equipment.history?.length === 0 ? (
                <p className="text-sm text-gray-400">Sem histórico registrado</p>
              ) : (
                <ol className="relative border-l border-gray-200 space-y-6 pl-4">
                  {equipment.history?.map((event) => (
                    <li key={event.id} className="ml-4">
                      <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-[var(--brand-primary)]" />
                      <p className="text-sm font-medium text-gray-900">{event.description}</p>
                      <p className="text-xs text-gray-400">
                        {event.user?.name} · {formatDateTime(event.created_at)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: QR Code */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Image
                src={qrUrl}
                alt={`QR Code ${equipment.internal_code}`}
                width={200}
                height={200}
                className="rounded-lg border border-gray-100 p-2"
                unoptimized
              />
              <a
                href={qrUrl}
                download={`${equipment.internal_code}-qr.png`}
                className="text-sm text-[var(--brand-primary)] hover:underline"
              >
                Download PNG
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
