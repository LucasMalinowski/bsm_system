import type { AuthUser, Permission, UserRole } from "@/types";

export const PERMISSIONS = {
  EQUIPMENT_READ: "equipment:read" as Permission,
  EQUIPMENT_CREATE: "equipment:create" as Permission,
  EQUIPMENT_UPDATE: "equipment:update" as Permission,
  EQUIPMENT_DELETE: "equipment:delete" as Permission,
  TICKET_READ: "ticket:read" as Permission,
  TICKET_CREATE: "ticket:create" as Permission,
  TICKET_UPDATE: "ticket:update" as Permission,
  TICKET_DELETE: "ticket:delete" as Permission,
  TICKET_ASSIGN: "ticket:assign" as Permission,
  DOCUMENT_READ: "document:read" as Permission,
  DOCUMENT_UPLOAD: "document:upload" as Permission,
  DOCUMENT_UPDATE: "document:update" as Permission,
  DOCUMENT_DELETE: "document:delete" as Permission,
  USER_READ: "user:read" as Permission,
  USER_INVITE: "user:invite" as Permission,
  USER_UPDATE: "user:update" as Permission,
  USER_DELETE: "user:delete" as Permission,
  COMPANY_READ: "company:read" as Permission,
  COMPANY_UPDATE: "company:update" as Permission,
  COMPANY_SETTINGS: "company:settings" as Permission,
  REPORT_VIEW: "report:view" as Permission,
} as const;

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, Permission[]> = {
  super_admin: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.EQUIPMENT_READ,
    PERMISSIONS.EQUIPMENT_CREATE,
    PERMISSIONS.EQUIPMENT_UPDATE,
    PERMISSIONS.EQUIPMENT_DELETE,
    PERMISSIONS.TICKET_READ,
    PERMISSIONS.TICKET_CREATE,
    PERMISSIONS.TICKET_UPDATE,
    PERMISSIONS.TICKET_DELETE,
    PERMISSIONS.TICKET_ASSIGN,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_UPDATE,
    PERMISSIONS.DOCUMENT_DELETE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_INVITE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.COMPANY_READ,
    PERMISSIONS.COMPANY_UPDATE,
    PERMISSIONS.COMPANY_SETTINGS,
    PERMISSIONS.REPORT_VIEW,
  ],
  employee: [
    PERMISSIONS.EQUIPMENT_READ,
    PERMISSIONS.TICKET_READ,
    PERMISSIONS.TICKET_CREATE,
    PERMISSIONS.TICKET_UPDATE,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.COMPANY_READ,
  ],
};

export function can(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return user.permissions.includes(permission);
}

export function hasRole(user: AuthUser | null, role: UserRole): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return user.role === role;
}

export function isSuperAdmin(user: AuthUser | null): boolean {
  return user?.role === "super_admin";
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "super_admin" || user?.role === "admin";
}
