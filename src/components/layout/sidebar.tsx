"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  Ticket,
  FileText,
  Users,
  Settings,
  Building2,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useSession } from "@/components/providers/session-provider";
import { Avatar } from "@/components/ui/avatar";
import { PERMISSIONS } from "@/lib/auth/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
  // "admin" = visível para admin e abaixo (não super_admin)
  // "super_admin" = visível apenas para super_admin
  scope?: "company" | "super_admin";
}

// Itens escopados por empresa (admin + employee)
const companyNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/equipment", label: "Equipamentos", icon: Wrench, permission: PERMISSIONS.EQUIPMENT_READ },
  { href: "/tickets", label: "Chamados", icon: Ticket, permission: PERMISSIONS.TICKET_READ },
  { href: "/documents", label: "Documentos", icon: FileText, permission: PERMISSIONS.DOCUMENT_READ },
  { href: "/admin/users", label: "Usuários", icon: Users, permission: PERMISSIONS.USER_READ, scope: "company" },
  { href: "/admin/settings", label: "Configurações", icon: Settings, scope: "company" },
];

// Itens exclusivos do super_admin (sem empresa)
const superAdminNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/super-admin/companies", label: "Empresas", icon: Building2 },
  { href: "/super-admin/equipment", label: "Equipamentos", icon: Wrench },
  { href: "/super-admin/tickets", label: "Chamados", icon: Ticket },
  { href: "/super-admin/documents", label: "Documentos", icon: FileText },
  { href: "/super-admin/users", label: "Usuários", icon: Users },
  { href: "/super-admin/audit", label: "Auditoria", icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, can, hasRole } = useSession();

  const isSuperAdmin = hasRole("super_admin") && user?.role === "super_admin";
  const isImpersonating = !!user?.impersonating;

  // Show company nav when impersonating a company, otherwise super_admin-specific nav
  const navItems = isSuperAdmin && !isImpersonating ? superAdminNavItems : companyNavItems;

  const visibleItems = navItems.filter((item) => {
    // Itens de scope "company" só para admins (super_admin impersonating counts as admin)
    if (item.scope === "company" && !hasRole("admin") && !isImpersonating) return false;
    if (item.permission && !can(item.permission)) return false;
    return true;
  });

  return (
    <aside className="flex h-full w-64 flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <span className="text-xl font-bold tracking-tight">BSM</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--sidebar-active)]"
                      : "hover:bg-[var(--sidebar-hover)]"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} src={user.avatar_url} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs opacity-70">{user.email}</p>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                title="Sair"
                className="rounded p-1 hover:bg-[var(--sidebar-hover)] transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
