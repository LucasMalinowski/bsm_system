"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { Avatar } from "@/components/ui/avatar";
import { PERMISSIONS } from "@/lib/auth/permissions";

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
        <button
          className="relative w-9 h-9 rounded-[9px] flex items-center justify-center text-gray-500 transition-colors hover:bg-gray-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="absolute top-2 right-2 w-[7px] h-[7px] rounded-full bg-red-500 border-2 border-white" />
        </button>
        {user && <Avatar name={user.name} src={user.avatar_url} size="sm" />}
      </div>
    </header>
  );
}
