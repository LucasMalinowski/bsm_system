import { getServerSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createUserService } from "@/lib/services/user.service";
import { createCompanyService } from "@/lib/services/company.service";
import { isAdmin } from "@/lib/auth/permissions";
import { forbidden, redirect } from "next/navigation";
import { formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { InviteDialog } from "@/components/users/invite-dialog";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  employee: "Colaborador",
};
const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: "#fee2e2", text: "#b91c1c" },
  admin:       { bg: "#e0f0fb", text: "#0363a9" },
  employee:    { bg: "#f3f4f6", text: "#374151" },
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default async function UsersPage() {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role === "super_admin" && !user.impersonating) redirect("/super-admin/companies");
  if (!isAdmin(user)) forbidden();
  if (!user.company_id) forbidden();

  const supabase = await createSupabaseServerClient();
  const service = createUserService(supabase);
  const [users, company] = await Promise.all([
    service.listByCompany(user.company_id),
    createCompanyService(supabase).getById(user.company_id),
  ]);

  return (
    <div className="p-4 lg:p-7 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] lg:text-[22px] font-extrabold text-gray-900">Usuários</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}</p>
        </div>
        <InviteDialog defaultCompanyId={user.company_id ?? undefined} defaultCompanyName={company?.name}>
          <button
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--brand-primary)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Convidar Usuário
          </button>
        </InviteDialog>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Usuário", "Perfil", "Status", "Último acesso", ""].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const rb = ROLE_BADGE[u.role] ?? ROLE_BADGE.employee;
              return (
                <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
                        {initials(u.name)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{u.name}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{ROLE_LABELS[u.role] ?? u.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" style={{ background: rb.bg, color: rb.text }}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold" style={{ background: u.is_active ? "#dcfce7" : "#f3f4f6", color: u.is_active ? "#166534" : "#374151" }}>
                      {u.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-400">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="text-[12px] text-[var(--brand-primary)] hover:underline font-medium">
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="lg:hidden flex flex-col gap-2.5">
        {users.map((u) => {
          const rb = ROLE_BADGE[u.role] ?? ROLE_BADGE.employee;
          return (
            <Link key={u.id} href={`/admin/users/${u.id}`}>
              <div className="bg-white border border-gray-200 rounded-[14px] p-3.5 flex items-center gap-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0">
                  {initials(u.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-gray-900">{u.name}</div>
                  <div className="text-[11px] text-gray-400">{formatDate(u.created_at)}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-semibold px-2 py-[2px] rounded-full" style={{ background: rb.bg, color: rb.text }}>{ROLE_LABELS[u.role] ?? u.role}</span>
                  <span className="text-[10px] font-semibold px-2 py-[2px] rounded-full" style={{ background: u.is_active ? "#dcfce7" : "#f3f4f6", color: u.is_active ? "#166534" : "#374151" }}>
                    {u.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
