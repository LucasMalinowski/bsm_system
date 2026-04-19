import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTicketService } from "@/lib/services/ticket.service";
import { createEquipmentService } from "@/lib/services/equipment.service";
import { createCompanyService } from "@/lib/services/company.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Ticket, AlertTriangle, CheckCircle, Building2 } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getServerSession();
  const supabase = await createSupabaseServerClient();

  // Super admin: mostra visão global (total de empresas)
  if (user?.role === "super_admin") {
    const companyService = createCompanyService(supabase);
    const companies = await companyService.listAll();

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {user.name?.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">Visão global do sistema</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">Empresas</CardTitle>
                <div className="rounded-lg bg-blue-50 p-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{companies.length}</p>
              <Link href="/super-admin/companies" className="mt-2 text-xs text-[var(--brand-primary)] hover:underline">
                Gerenciar empresas →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Usuário de empresa: mostra stats da empresa
  let equipmentCount = 0;
  let ticketCounts: Record<string, number> = {};

  if (user?.company_id) {
    const equipmentService = createEquipmentService(supabase);
    const ticketService = createTicketService(supabase);

    const [equipmentResult, counts] = await Promise.all([
      equipmentService.list(user.company_id, { page: 1, limit: 1, sort: "updated_at", order: "desc" }),
      ticketService.getStatusCounts(user.company_id),
    ]);

    equipmentCount = equipmentResult.pagination.total;
    ticketCounts = counts;
  }

  const stats = [
    { label: "Equipamentos", value: equipmentCount, icon: Wrench, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Chamados Abertos", value: ticketCounts["open"] ?? 0, icon: Ticket, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Em Andamento", value: ticketCounts["in_progress"] ?? 0, icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "Resolvidos", value: ticketCounts["resolved"] ?? 0, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">Aqui está um resumo do sistema</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-500">{stat.label}</CardTitle>
                  <div className={`rounded-lg p-2 ${stat.bg}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
