"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useSession } from "@/components/providers/session-provider";
import { Avatar } from "@/components/ui/avatar";
import { PERMISSIONS } from "@/lib/auth/permissions";

// SVG icons matching the design spec exactly
const IcoD = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  chart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  wrench: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  ticket: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"/>
    </svg>
  ),
  file: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93l-1.41 1.41M5.34 17.66l-1.41 1.41M19.07 19.07l-1.41-1.41M5.34 6.34l-1.41-1.41M22 12h-2M4 12H2M12 22v-2M12 4V2"/>
    </svg>
  ),
  building: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  clipboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  ),
  logout: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  permission?: (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
  scope?: "company" | "super_admin";
}

const companyNavItems: NavItem[] = [
  { href: "/dashboard",      label: "Dashboard",     icon: IcoD.dashboard },
  { href: "/equipment",      label: "Equipamentos",  icon: IcoD.wrench,    permission: PERMISSIONS.EQUIPMENT_READ },
  { href: "/tickets",        label: "Chamados",      icon: IcoD.ticket,    permission: PERMISSIONS.TICKET_READ },
  { href: "/documents",      label: "Documentos",    icon: IcoD.file,      permission: PERMISSIONS.DOCUMENT_READ },
  { href: "/admin/reports",  label: "Relatórios",    icon: IcoD.chart,     scope: "company" },
  { href: "/admin/users",    label: "Usuários",      icon: IcoD.users,     permission: PERMISSIONS.USER_READ, scope: "company" },
  { href: "/admin/settings", label: "Configurações", icon: IcoD.settings,  scope: "company" },
];

const IcoCalibration = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
  </svg>
);

const superAdminNavItems: NavItem[] = [
  { href: "/dashboard",                           label: "Dashboard",      icon: IcoD.dashboard },
  { href: "/super-admin/companies",               label: "Empresas",       icon: IcoD.building },
  { href: "/super-admin/equipment",               label: "Equipamentos",   icon: IcoD.wrench },
  { href: "/super-admin/tickets",                 label: "Chamados",       icon: IcoD.ticket },
  { href: "/super-admin/documents",               label: "Documentos",     icon: IcoD.file },
  { href: "/super-admin/calibration-documents",   label: "Doc. Calibração", icon: IcoCalibration },
  { href: "/super-admin/reports",                  label: "Relatórios",     icon: IcoD.chart },
  { href: "/super-admin/users",                   label: "Usuários",       icon: IcoD.users },
  { href: "/super-admin/audit",                   label: "Auditoria",      icon: IcoD.clipboard },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, can, hasRole } = useSession();

  const isSuperAdmin = hasRole("super_admin") && user?.role === "super_admin";
  const isImpersonating = !!user?.impersonating;
  const isSuperAdminRoute = pathname.startsWith("/super-admin");
  const navItems =
    isSuperAdmin && (isSuperAdminRoute || !isImpersonating)
      ? superAdminNavItems
      : companyNavItems;

  const visibleItems = navItems.filter((item) => {
    if (item.scope === "company" && !hasRole("admin") && !isImpersonating) return false;
    if (item.permission && !can(item.permission)) return false;
    return true;
  });

  return (
    <aside
      className="hidden lg:flex h-full w-60 flex-shrink-0 flex-col"
      style={{ background: "var(--sidebar-bg)", color: "var(--sidebar-text)" }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="10" height="2.5" rx="1" fill="white" opacity="0.9"/>
            <rect x="4" y="8.5" width="16" height="2.5" rx="1" fill="white" opacity="0.9"/>
            <rect x="4" y="13" width="13" height="2.5" rx="1" fill="white" opacity="0.9"/>
            <rect x="4" y="17.5" width="8" height="2.5" rx="1" fill="white" opacity="0.6"/>
          </svg>
        </div>
        <span className="text-[18px] font-extrabold tracking-wide">BSM</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13px] font-medium transition-colors duration-150 w-full",
                    isActive
                      ? "font-semibold"
                      : "text-white/75"
                  )}
                  style={
                    isActive
                      ? { background: "var(--sidebar-active)", color: "#fff" }
                      : undefined
                  }
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.8 }}>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-white/10 px-3.5 py-3 flex items-center gap-2.5">
          <Avatar name={user.name} src={user.avatar_url} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-[12px] font-semibold">{user.name}</p>
            <p className="truncate text-[10px] opacity-55">{user.email}</p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              title="Sair"
              className="rounded p-1 transition-colors text-white/60 hover:text-white"
              style={{ background: "none", border: "none" }}
            >
              {IcoD.logout}
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
