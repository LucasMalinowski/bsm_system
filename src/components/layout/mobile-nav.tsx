"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { PERMISSIONS } from "@/lib/auth/permissions";

const IcoDash = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#0363a9" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const IcoWrench = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#0363a9" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);

const IcoTicket = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#0363a9" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"/>
  </svg>
);

const IcoQr = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#0363a9" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/>
    <rect x="16" y="3" width="5" height="5"/>
    <path d="M21 16h-3v3M21 21h-1M16 16h1v1"/>
    <path d="M5.5 5.5h0M5.5 18.5h0M18.5 5.5h0"/>
  </svg>
);

const IcoFile = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#0363a9" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const IcoUsers = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#0363a9" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IcoBuilding = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#0363a9" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);

const IcoClipboard = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#0363a9" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);

const COMPANY_NAV = [
  { href: "/dashboard", label: "Início", Icon: IcoDash },
  { href: "/equipment", label: "Equip.", Icon: IcoWrench, permission: PERMISSIONS.EQUIPMENT_READ },
  { href: "/tickets", label: "Chamados", Icon: IcoTicket, permission: PERMISSIONS.TICKET_READ },
  { href: "/equipment/qr-scanner", label: "Scanner", Icon: IcoQr, permission: PERMISSIONS.EQUIPMENT_READ },
] as const;

const SUPER_ADMIN_NAV = [
  { href: "/dashboard", label: "Início", Icon: IcoDash },
  { href: "/super-admin/companies", label: "Empresas", Icon: IcoBuilding },
  { href: "/super-admin/equipment", label: "Equip.", Icon: IcoWrench },
  { href: "/super-admin/tickets", label: "Chamados", Icon: IcoTicket },
  { href: "/super-admin/documents", label: "Docs", Icon: IcoFile },
  { href: "/super-admin/users", label: "Usuários", Icon: IcoUsers },
  { href: "/super-admin/audit", label: "Auditoria", Icon: IcoClipboard },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const { user, can, hasRole } = useSession();
  const isSuperAdmin = hasRole("super_admin") && user?.role === "super_admin";
  const isImpersonating = !!user?.impersonating;
  const isSuperAdminRoute = pathname.startsWith("/super-admin");
  const navItems =
    isSuperAdmin && (isSuperAdminRoute || !isImpersonating)
      ? SUPER_ADMIN_NAV
      : COMPANY_NAV;
  const visibleNav = navItems.filter((item) => !("permission" in item) || !item.permission || can(item.permission));

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white overflow-x-auto"
      style={{ height: 72, paddingBottom: 8 }}
    >
      <div className="flex min-w-max">
      {visibleNav.map(({ href, label, Icon }) => {
        const active =
          pathname === href ||
          (href !== "/dashboard" &&
            pathname.startsWith(href) &&
            !visibleNav.some(
              (item) =>
                item.href !== href &&
                pathname.startsWith(item.href) &&
                item.href.length > href.length
            ));
        return (
          <Link
            key={href}
            href={href}
            className="flex min-w-[76px] flex-col items-center justify-center gap-[3px] px-2 pt-2"
            style={{ color: active ? "#0363a9" : "#9ca3af" }}
          >
            <div
              className="flex items-center justify-center transition-all duration-150"
              style={{
                width: 40,
                height: 28,
                borderRadius: 14,
                background: active ? "#e0f0fb" : "transparent",
              }}
            >
              <Icon active={active} />
            </div>
            <span className="text-[10px]" style={{ fontWeight: active ? 600 : 400 }}>
              {label}
            </span>
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
