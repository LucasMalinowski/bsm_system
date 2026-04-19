"use client";

import { Bell } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { Avatar } from "@/components/ui/avatar";

export function Topbar({ title }: { title?: string }) {
  const { user } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
      {!title && <div />}

      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5 text-gray-500" />
        </button>
        {user && <Avatar name={user.name} src={user.avatar_url} size="sm" />}
      </div>
    </header>
  );
}
