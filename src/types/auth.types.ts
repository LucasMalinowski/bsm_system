export type UserRole = "super_admin" | "admin" | "employee";

export type Permission =
  | "equipment:read"
  | "equipment:create"
  | "equipment:update"
  | "equipment:delete"
  | "ticket:read"
  | "ticket:create"
  | "ticket:update"
  | "ticket:delete"
  | "ticket:assign"
  | "document:read"
  | "document:upload"
  | "document:update"
  | "document:delete"
  | "user:read"
  | "user:invite"
  | "user:update"
  | "user:delete"
  | "company:read"
  | "company:update"
  | "company:settings"
  | "report:view";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company_id: string | null;
  avatar_url: string | null;
  permissions: Permission[];
  /** Set when a super_admin is impersonating a company */
  impersonating?: string | null;
}
