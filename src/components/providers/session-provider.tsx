"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AuthUser, Permission, UserRole } from "@/types";
import { can as canFn, hasRole as hasRoleFn } from "@/lib/auth/permissions";

interface SessionContextValue {
  user: AuthUser | null;
  can: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  can: () => false,
  hasRole: () => false,
});

export function SessionProvider({
  user,
  children,
}: {
  user: AuthUser | null;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider
      value={{
        user,
        can: (permission) => canFn(user, permission),
        hasRole: (role) => hasRoleFn(user, role),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
