"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { Avatar } from "@/components/ui/avatar";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { NotificationsBell } from "@/components/layout/notifications-bell";

export function Topbar() {
  const pathname = usePathname();
  const { user, can } = useSession();
  const showNewTicketButton =
    pathname !== "/admin/settings" &&
    !pathname.startsWith("/super-admin") &&
    can(PERMISSIONS.TICKET_CREATE);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 flex-shrink-0">
      <div />
      <div className="flex items-center gap-3">
        {showNewTicketButton && (
          <Link
            href="/tickets/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Chamado
          </Link>
        )}
        <NotificationsBell />
        {user && <Avatar name={user.name} src={user.avatar_url} size="sm" />}
      </div>
    </header>
  );
}
