# BSM System — Feature Reference

## Overview

BSM System is a multi-tenant calibration management SaaS built with Next.js 16 and Supabase. It is designed for laboratories and industrial clients that need to track equipment, manage calibration records, handle maintenance tickets, and control document distribution.

Multi-tenancy is enforced at the application layer: every resource record carries a `company_id`, and session resolution injects the correct company context on every request. Super admins operate across all companies; admins and employees are scoped to a single company.

**Stack:** Next.js 16, React, Tailwind CSS, Supabase (PostgreSQL + Storage), Resend (email), fflate (XLSX patching), qrcode (QR generation), jsqr (QR decode from camera).

---

## User Roles & Permissions

| Permission             | `super_admin` | `admin`                           | `employee`                    |
|------------------------|---------------|-----------------------------------|-------------------------------|
| `equipment:read`       | ✅             | ✅                                 | ✅                             |
| `equipment:create`     | ✅             | ✅                                 | ❌                             |
| `equipment:update`     | ✅             | ✅                                 | ❌                             |
| `equipment:delete`     | ✅             | ✅                                 | ❌                             |
| `ticket:read`          | ✅             | ✅                                 | ✅                             |
| `ticket:create`        | ✅             | ✅                                 | ✅                             |
| `ticket:update`        | ✅             | ✅                                 | ✅                             |
| `ticket:delete`        | ✅             | ✅                                 | ❌                             |
| `ticket:assign`        | ✅             | ✅                                 | ❌                             |
| `document:read`        | ✅             | ✅                                 | ✅ (visible_to_employees only) |
| `document:upload`      | ✅             | ❌ (hard-coded; API blocks admins) | ❌                             |
| `document:update`      | ✅             | ✅                                 | ❌                             |
| `document:delete`      | ✅             | ✅                                 | ❌                             |
| `user:read`            | ✅             | ✅                                 | ❌                             |
| `user:invite`          | ✅             | ✅                                 | ❌                             |
| `user:update`          | ✅             | ✅                                 | ❌                             |
| `user:delete`          | ✅             | ✅                                 | ❌                             |
| `company:read`         | ✅             | ✅                                 | ✅                             |
| `company:update`       | ✅             | ✅                                 | ❌                             |
| `company:settings`     | ✅             | ✅                                 | ❌                             |
| `report:view`          | ✅             | ✅                                 | ❌                             |
| `calibration:read`     | ✅             | ✅                                 | ✅                             |
| `calibration:manage`   | ✅             | ✅                                 | ❌                             |
| `calibration:register` | ✅             | ❌                                 | ❌                             |

**Notes:**
- Permissions are resolved from `DEFAULT_PERMISSIONS_BY_ROLE` in `src/lib/auth/permissions.ts`, with per-user overrides stored in `user_permissions` table.
- `super_admin` always returns `true` from `can()` regardless of individual permissions.
- `isAdmin()` returns true for both `admin` and `super_admin`.
- Individual overrides are stored as a flat array of permission strings; the UI (RoleManager) shows them as a 5-module × 4-action matrix.

---

## Feature Status Legend

- ✅ Fully implemented and working end-to-end
- ⚠️ Partial implementation or has a known issue
- ❌ Missing, broken, or not exposed

---

## 1. Authentication & Session

### Login
✅ Form → `POST /api/auth/login` → Supabase `signInWithPassword` → cookies set → redirect `/dashboard`.

### Logout
✅ `POST /api/auth/signout` → `signOut()` + cookie clear → redirect `/login`.

### Password Reset
✅ `/forgot-password` → `resetPasswordForEmail` → `/api/auth/callback` → `/update-password` → `updateUser`.

### Invitation Flow
- **Route:** `POST /api/invitations` → Supabase `inviteUserByEmail`
- **Accept page:** `/invite/[token]` — profile updated on accept
- ✅ Admin and SA can invite users; SA can invite to any company via `isSuperAdmin` flag on `InviteDialog`
- ⚠️ No email-match verification on accept — any authenticated session can accept any token
- ⚠️ Avatar upload error during acceptance is silently ignored

### Session Management
- **File:** `src/lib/auth/get-session.ts`
- ✅ `getServerSession()` uses React `cache()` — deduplicated per render pass
- ✅ Uses `supabase.auth.getSession()` (local cookie read, ~0ms) instead of `getUser()` (network call)
- ✅ Profile, permissions, and cookies fetched in parallel via `Promise.all`
- ✅ `/api/auth/refresh` route exists for external/mobile clients
- ⚠️ Refresh route not automatically called by the web client — relies on Supabase cookie refresh in `proxy.ts`

### Impersonation (SA only)
- ✅ `POST /api/super-admin/impersonate` sets `bsm_impersonate` httpOnly cookie (8h TTL)
- ✅ `ImpersonationBanner` shown in dashboard layout when active
- ✅ Exit via `POST /api/super-admin/impersonate/exit` — clears cookie, redirects to `/super-admin/companies`
- ⚠️ No audit log of impersonation start/end
- ⚠️ No `company_id` validation — any UUID is accepted without checking it belongs to an existing company

### Security Gaps
- ❌ No rate limiting on `/api/auth/login`, `/forgot-password`, or `/api/super-admin/impersonate`
- ❌ No CSRF protection on state-changing POST routes
- ❌ No audit log of login, logout, or failed attempts
- ⚠️ No MFA/2FA support
- ⚠️ No session revocation (cannot force-logout an active user)
- ⚠️ No last-seen / login activity tracking

---

## 2. Dashboard

### Company User Dashboard (`/dashboard`)
- ✅ Displays total equipment count and active ticket count using a single `equipmentService.list()` call (the `pagination.total` from the paginated response eliminates a second count query)
- ✅ Recent equipment and recent tickets shown
- ⚠️ No calibration-due alerts displayed even though the field exists (`next_calibration` on `Equipment`)
- ⚠️ No "overdue calibration" widget

### Super Admin Dashboard (`/super-admin/dashboard`)
- Global stats across all companies via admin Supabase client
- ⚠️ Specific implementation not audited in detail; SA navigates primarily through the dedicated sub-panels

---

## 3. Equipment

### List Equipment
- **Page:** `src/app/(dashboard)/equipment/page.tsx`
- **Component:** `src/components/equipment/equipment-list-client.tsx`
- **API:** `GET /api/equipment` — validated with `equipmentFilterSchema`
- ✅ Full-text search (name, `internal_code`, brand)
- ✅ Status filters: `active | inactive | under_maintenance | calibration | retired`
- ✅ Sort by name, `internal_code`, status, `updated_at`
- ✅ Pagination — response: `{ data, pagination: { page, limit, total, total_pages } }`
- ✅ Responsive: desktop table + mobile card list
- ✅ QR icon in last table column (opens PNG in new tab)
- ✅ SA without impersonation may pass `company_id` query param to browse any company
- ✅ Delete button (with confirmation) visible for users with `EQUIPMENT_DELETE` permission

### Create Equipment
- **Entry point:** `src/app/(dashboard)/equipment/new/page.tsx` — auto-opens the 3-step modal wizard via `NewEquipmentPageClient`; redirects to `/equipment` on close
- **Component:** `src/components/equipment/new-equipment-modal.tsx`
- ✅ **3-step wizard (modal):**
  - Step 1: name, `internal_code`, brand, model, serial, status, location, `acquisition_date`, `requires_calibration`, periodicity
  - Step 2: optional photo upload + calibration points
  - Step 3: confirmation with doc-copy preview
- ✅ Photo upload: `POST /api/equipment/photo` → `equipment-photos` bucket, max 5 MB, path `{company_id}/{uuid}.{ext}`
- ✅ Calibration points saved inline: `POST /api/equipment/{id}/calibration-points`
- ✅ Doc copy from same model: `POST /api/equipment/{id}/copy-docs` — creates new document records pointing to same `storage_path` (no file duplication)

### View Equipment Detail
- **Page:** `src/app/(dashboard)/equipment/[id]/page.tsx`
- **Component:** `src/components/equipment/equipment-detail-client.tsx`
- ✅ **Tabs:**
  - `dados`: brand, model, serial, category, location, `acquisition_date`, `next_calibration`, `last_calibration`, notes; "Editar" button (for users with `EQUIPMENT_UPDATE`) opens an edit modal
  - `calibração`: calibration points table (inline edit), calibration history, "Registrar Calibração" button (SA only)
  - `manutenção`: history entries filtered by `action = maintenance | updated`
  - `docs`: history entries filtered by `action = document_added`

### Edit Equipment
- **API:** `PATCH /api/equipment/{id}` — `updateEquipmentSchema` (all fields optional), with audit trail via `EquipmentService.update()`
- ✅ "Editar" button in `dados` tab opens a modal pre-filled with current values (name, brand, model, serial, status, location, notes)
- ✅ Save calls `PATCH /api/equipment/{id}` then refreshes the page

### Delete Equipment
- **API:** `DELETE /api/equipment/{id}` — requires `EQUIPMENT_DELETE` permission, logs audit entry
- ✅ Wired in SA panel (`/super-admin/equipment`) with confirmation dialog
- ✅ Delete button in company equipment list for users with `EQUIPMENT_DELETE` permission

### QR Code Generation
- **API:** `GET /api/equipment/{id}/qrcode` — generates PNG via `qrcode` library, encodes URL `/api/equipment/qr/{qr_code_token}`, `Cache-Control: max-age=86400`
- **Scan redirect:** `GET /api/equipment/qr/{token}` (public) — resolves token to equipment, redirects to `/equipment/{id}`, or `/not-found`
- ✅ QR token generated on creation (`crypto.randomUUID()`), stored in `equipment.qr_code_token`, never changes
- ✅ Download button in detail view + icon link in list table

### QR Scanner
- **Page:** `src/app/(dashboard)/equipment/qr-scanner/page.tsx`
- **Component:** `QRScannerClient`
- ✅ Camera access via `navigator.mediaDevices.getUserMedia()`; visual overlay (corner brackets, scan line)
- ✅ Real-time QR decode: `jsqr` processes canvas frames in a `requestAnimationFrame` loop; navigates to `/equipment/{id}` on success
- ✅ Manual token entry fallback with navigation to equipment
- ✅ Recent scans stored in `localStorage` (last 10)

---

## 4. Calibration

### Calibration Points (per equipment)
- **API:** `GET /api/equipment/{id}/calibration-points` / `POST /api/equipment/{id}/calibration-points` (replaces all)
- **DB table:** `equipment_calibration_points` — `point_value`, `criterion`, `error_tolerance`, `sort_order`
- ✅ Inline view/edit in "calibração" tab — "Editar" enables text inputs, add/remove/save/cancel buttons
- ✅ Frontend validates via `pointSchema` before sending

### Register Calibration (SA only)
- **Component:** `RegisterCalibrationModal` in `EquipmentDetailClient`
- **API flow:**
  1. `POST /api/equipment/{id}/calibrations/child-spreadsheet` — downloads template XLSX, patches XML placeholders (`{{nome_equipamento}}`, `{{codigo_interno}}`, `{{data_calibracao}}`, `{{ponto_N_valor}}`, `{{ponto_N_criterio}}`, `{{ponto_N_erro}}`), re-zips via `fflate`, uploads to `calibration-records` bucket
  2. `POST /api/equipment/{id}/calibrations` — creates record with `template_doc_id`, `performed_at`, `notes`, `child_storage_path`
- ✅ Template is optional (calibration can be registered without a spreadsheet)
- ✅ Only `super_admin` can register calibrations; regular users see the history but not the button

### Download Child XLSX
- **API:** `GET /api/equipment/{id}/calibrations/{recordId}/download` — generates 5-minute signed URL, redirects browser
- ✅ "Planilha" button in calibration history row (only shown when `child_storage_path` exists)

### Upload Certificate
- **API:** `POST /api/equipment/{id}/calibrations/{recordId}/certificate` (SA only) — accepts `.pdf`, `.jpg`, `.png`, uploads to `calibration-records/certificates/{equipmentId}/{recordId}.{ext}`
- ✅ "Certificado" button triggers hidden file input; shows green "Certificado ✓" badge once uploaded

### Calibration History
- **API:** `GET /api/equipment/{id}/calibrations`
- **DB table:** `calibration_records` — `equipment_id`, `company_id`, `performed_by`, `template_doc_id`, `child_storage_path`, `certificate_storage_path`, `performed_at`, `notes`
- ✅ Lists performed_at, performer name, template doc name (optional), download and certificate buttons

### Calibration Template Management (SA only)
- **Page:** `src/app/(dashboard)/super-admin/calibration-documents/page.tsx`
- **APIs:** `POST /api/calibration-documents`, `POST /api/calibration-documents/{id}/versions`, `GET /api/calibration-documents/{id}/download`
- **DB tables:** `calibration_documents`, `calibration_document_versions`
- ✅ Upload template XLSX → creates v1 record
- ✅ Version management: expandable "Versões (N)" section, each version shows date/uploader/size/notes
- ✅ Download current version via signed URL
- ✅ In-page placeholder variable guide (tutorial card with all `{{...}}` variables listed)

### Calibration Due Notifications (Cron)
- **Cron:** `vercel.json` — daily at 08:00 UTC → `GET /api/cron/calibration-due`
- **Auth:** `Authorization: Bearer $CRON_SECRET` header (env var `CRON_SECRET`)
- ✅ Queries equipment where `next_calibration <= now + 7 days` and `requires_calibration = true`
- ✅ Creates `calibration_due` in-app notification for each company admin
- ✅ Respects per-user `cal_alert` preference from `notification_preferences` table — skips users who disabled it

---

## 5. Tickets / Chamados

### List Tickets
- **Page:** `src/app/(dashboard)/tickets/page.tsx`
- **Component:** `src/components/tickets/tickets-list-client.tsx`
- **API:** `GET /api/tickets`
- ✅ Status tab bar: Todos / Aberto / Em Andamento / Resolvido
- ✅ Filters: status, priority, equipment, text search
- ✅ Pagination, sort; responsive table + card layout
- ✅ Delete button (with confirmation) for users with `TICKET_DELETE` permission

### Create Ticket
- **Component:** `src/components/tickets/new-ticket-modal.tsx`
- **API:** `POST /api/tickets`
- ✅ 3-step modal: select equipment → fill details (title, description, priority, photo) → confirm
- ✅ Employee: auto-assigns to single admin, or presents selection if multiple admins exist
- ✅ Admin: assign to anyone, or toggle "Acionar Suporte BSM" (`is_support_request=true`) to route to SA
- ✅ Optional photo upload → `ticket-photos` bucket
- ✅ Notification sent on create: company admins notified; SA notified for support requests

### Ticket Detail (`/tickets/[id]`)
- **Component:** `src/components/tickets/ticket-detail-client.tsx`
- ✅ Shows title, description, status/priority badges, creator, assignee sidebar, linked equipment, `resolved_at`
- ✅ `is_support_request` badge shown in detail header when applicable
- ✅ `photo_url` displayed as full image in detail view when non-null
- ✅ Status action buttons based on valid transitions (e.g. "Iniciar", "Resolver", "Fechar") — calls `PATCH /api/tickets/{id}` with `{ status }`
- ✅ Comments list with avatar + timestamp
- ✅ Comment form (textarea + submit) → `POST /api/tickets/{id}/comments` with `{ body }`
- ✅ Reassignment: `assigned_to` can be PATCHed via `PATCH /api/tickets/{id}` (API-level; no dedicated reassign UI in detail view)

### Status Transitions
Valid transition map (enforced server-side in `TicketService.update()`):
- `open` → `in_progress`, `closed`
- `in_progress` → `waiting`, `resolved`, `closed`
- `waiting` → `in_progress`, `resolved`, `closed`
- `resolved` → `closed`, `open`
- `closed` → `open`

- ✅ `resolved_at` set automatically when status moves to `resolved`
- ✅ In-app notification + email (Resend) sent to ticket creator on status change
- ✅ `ticket_assigned` in-app notification sent to assignee when `assigned_to` changes

### Delete Ticket
- **API:** `DELETE /api/tickets/{id}` with audit log
- ✅ Delete button wired in SA panel (`/super-admin/tickets`)
- ✅ Delete button in company ticket list for users with `TICKET_DELETE` permission

### Support Request Flow
- ✅ Admin toggles "Acionar Suporte BSM" in creation modal → `is_support_request=true`
- ✅ Notification routed to SA on creation
- ✅ SA panel has "Suporte BSM" checkbox filter to show only support-request tickets
- ✅ Support request badge displayed in SA ticket list and ticket detail view

---

## 6. Documents

### List Documents
- **Page:** `src/app/(dashboard)/documents/page.tsx`
- **API:** `GET /api/documents`
- ✅ Search by name; filter by category, equipment
- ✅ Employees automatically filtered to `visible_to_employees=true` (server-side)
- ✅ Pagination; responsive table + card layout
- ✅ Download link and delete button (with confirmation) for users with `DOCUMENT_DELETE` permission

### Upload Document
- **API:** `POST /api/documents` — `multipart/form-data` with file + metadata
- ⚠️ **Hard-coded SA-only gate:** `if (!isSuperAdmin(user)) return forbiddenResponse(...)` — company admins cannot upload even though they hold `document:upload` in their default permissions
- ✅ SA upload works; `company_id` from `formData` used when SA is not impersonating
- ✅ Category picker shown in SA upload form if the selected company has categories configured
- ⚠️ No `equipment_id` linking UI during upload (field exists in schema, not in form)

### Document Detail (`/documents/[id]`)
- ✅ Shows metadata: name, description, version, uploader, linked equipment, `visible_to_employees` flag
- ✅ 60-second signed URL download via `GET /api/documents/{id}/download`
- ✅ "Upload Nova Versão" button (for users with `DOCUMENT_UPDATE`) → `POST /api/documents/{id}/versions`
- ✅ Version history shown with version number, size, date, uploader, and notes
- ✅ Delete button (for users with `DOCUMENT_DELETE`) with confirmation → `DELETE /api/documents/{id}`
- ⚠️ No inline PDF/image preview

### Employee Visibility Toggle
- **Component:** `VisibilityToggle` → `PATCH /api/documents/{id}` with `{ visible_to_employees }`
- ✅ Shown to admins and SA on document detail page

### Delete Document
- **API:** `DELETE /api/documents/{id}` — removes DB record and Storage object
- ✅ Delete button wired in SA panel (`/super-admin/documents`)
- ✅ Delete button in company documents list and detail page (guarded by `DOCUMENT_DELETE`)

### Version Management
- **API:** `POST /api/documents/{id}/versions` — `multipart/form-data` with `file` + optional `notes`; increments `documents.version` and updates `documents.storage_path`
- **DB:** `document_versions` table with `version`, `storage_path`, `file_size`, `notes`
- ✅ "Upload Nova Versão" button on detail page; version history listed below

### Document Categories
- **DB table:** `document_categories` (`company_id`, `name`, `description`)
- **APIs:** `GET /api/document-categories`, `POST /api/document-categories`, `DELETE /api/document-categories/{id}`
- ✅ Category field displayed in list and detail views
- ✅ Admin can manage categories from the Settings page (`DocumentCategoriesManager` component) — add by name/description, remove with one click
- ✅ SA upload form fetches and shows a category picker for the selected company

---

## 7. Users & Permissions

### User List (Admin Panel)
- **Page:** `src/app/(dashboard)/admin/users/page.tsx` (company scope)
- **SA equivalent:** `src/app/(dashboard)/super-admin/users/page.tsx` (cross-company, with company filter)
- ✅ Lists users with role and status badges; search + pagination (25/page in SA panel)

### Invite User
- **Component:** `InviteDialog` → `POST /api/invitations` → Supabase `inviteUserByEmail`
- ✅ Available to both admin (`/admin/users`) and SA (`/super-admin/users`)
- ✅ SA passes `isSuperAdmin` prop, allowing company selection during invite

### Edit User
- **Page:** `src/app/(dashboard)/admin/users/[id]/page.tsx`
- **SA equivalent:** `src/app/(dashboard)/super-admin/users/[id]/page.tsx`
- **Components:** `UserEditCard` (name, role, avatar) + `RoleManager` (permission matrix)
- ✅ `PATCH /api/users/{id}` updates profile fields
- ✅ `POST /api/users/avatar` → `avatars` bucket for avatar upload

### Deactivate / Activate User
- **API:** `PATCH /api/users/{id}/deactivate` — accepts `{ is_active: boolean }`, prevents self-deactivation
- ✅ Toggle button in `UserEditCard` (hidden for self)
- ✅ Deactivated users remain visible on detail page (bypasses `is_active` filter via `repo.findById`)

### Individual Permission Overrides
- **Component:** `src/components/admin/role-manager.tsx` — 5 modules × 4 actions matrix
- **APIs:** `PUT /api/users/{id}/permissions`, `GET /api/users/{id}/permissions`
- ✅ Overrides saved as flat permission string array; `can()` merges role defaults + overrides
- ⚠️ No visual diff showing which permissions differ from the role default

### Company-Level Role Defaults
- `role_permissions` table exists in schema
- ❌ No API endpoint (`/api/roles/permissions` does not exist)
- ❌ No UI — `RoleManager` only manages per-user overrides, not company-wide role defaults

---

## 8. Company Settings

### Theme (Colors)
- **Component:** `src/components/admin/settings-client.tsx` → `ThemeEditor`
- **API:** `PATCH /api/companies/{id}` with `revalidateTag("company-theme")`
- ✅ Admin can change `primary_color`; SA can change all colors + logo + name
- ✅ Layout uses `unstable_cache` (60s TTL, tag `company-theme`) backed by admin singleton — near-instant UI update on next navigation

### Logo Upload
- **API:** `POST /api/companies/{id}/logo` → `company-assets` bucket → public URL saved to company record
- ✅ `LogoUpload` component used on both admin settings page and SA company detail page

### Company Name / CNPJ
- ✅ Company name editable by SA only (`isFullAdmin` check in `settings-client.tsx`)
- ✅ CNPJ editable by SA (`cnpj` field in `updateCompanySchema`, sent in PATCH body when `isFullAdmin`)

### Notification Preferences
- **API:** `GET /api/notifications/preferences` / `PATCH /api/notifications/preferences`
- **DB table:** `notification_preferences` (`user_id`, `cal_alert`, `unassigned`, `weekly`)
- ✅ Toggle switches for `cal_alert`, `unassigned`, `weekly` loaded from API on settings page mount
- ✅ Preferences saved alongside company PATCH when "Salvar alterações" is clicked
- ✅ Calibration due cron respects `cal_alert` preference before sending notifications

### Document Category Management
- **Component:** `DocumentCategoriesManager` (embedded in admin settings page)
- ✅ Admin can add categories (name + optional description) and remove existing ones
- ✅ Changes take effect immediately in document upload and list views

---

## 9. Notifications

### In-App Bell
- **Component:** `NotificationsBell` — polls every 30 seconds
- ✅ Mark single read: `POST /api/notifications/{id}/read`
- ✅ Mark all read: `POST /api/notifications/read-all`
- ⚠️ No Supabase Realtime subscription — 30-second delay before new notifications appear

### Triggered Events
| Event                   | Status | Recipient                                      |
|-------------------------|--------|------------------------------------------------|
| `ticket_created`        | ✅      | Company admins (or SA for support requests)    |
| `ticket_status_changed` | ✅      | Ticket creator; email via Resend if configured |
| `ticket_assigned`       | ✅      | Assignee (fired in `TicketService.update()` when `assigned_to` changes) |
| `equipment_created`     | ✅      | Company admins                                 |
| `calibration_due`       | ✅      | Company admins with `cal_alert` enabled (daily cron) |

### Email (Resend)
- ✅ Sends email on `ticket_status_changed` if `RESEND_API_KEY` env var is set
- ⚠️ Silent failure if `RESEND_API_KEY` is missing — no warning logged, no error surfaced to user
- ⚠️ Only one event type sends email; all others are in-app only

---

## 10. Super Admin Panel

### SA Equipment (`/super-admin/equipment`)
- ✅ Lists equipment across all companies; search by name/`internal_code`; pagination (25/page)
- ✅ Create with company picker overlay → `NewEquipmentModal` — passes `company_id` in body; API uses `isSuperAdmin(user) && !user.company_id ? body.company_id : user.company_id` pattern
- ✅ Links to `/equipment/{id}` for edit (standard detail page reused)
- ✅ Delete with confirmation dialog → `DELETE /api/equipment/{id}`

### SA Tickets (`/super-admin/tickets`)
- ✅ Lists tickets across all companies with company name, equipment, assignee; status filter + search + pagination
- ✅ Create with company picker → `NewTicketModal` with `saCompanyId` prop; equipment list filtered to selected company
- ✅ Click-through to `/tickets/{id}` (standard detail page)
- ✅ Delete with confirmation → `DELETE /api/tickets/{id}`
- ✅ "Suporte BSM" checkbox filter — shows only `is_support_request=true` tickets
- ✅ Support request badge on rows where `is_support_request=true`

### SA Documents (`/super-admin/documents`)
- ✅ Lists documents across all companies; search by name; pagination
- ✅ Upload with company picker — `POST /api/documents` with `formData.company_id`; optional category picker populated from selected company's categories
- ✅ Delete → `DELETE /api/documents/{id}`
- ✅ `GET /api/documents` supports `company_id` query param for SA without impersonation

### SA Users (`/super-admin/users`)
- ✅ Lists all users across companies; company filter + search; pagination (25/page)
- ✅ Detail page `src/app/(dashboard)/super-admin/users/[id]/page.tsx` — `notFound()` guard, `UserEditCard` + `RoleManager`
- ✅ Invite via `InviteDialog` with `isSuperAdmin=true` prop
- ✅ Deactivate/activate toggle in `UserEditCard` on both admin and SA user detail pages

### SA Companies (`/super-admin/companies`)
- ✅ Lists companies with user count, color gradient preview; no pagination (assumed small set)
- ✅ Create company: name, slug, admin email, color picker → `POST /api/companies`; sends invitation to admin
- ✅ Impersonate: "Entrar" → `POST /api/super-admin/impersonate` → cookie → redirect `/dashboard`
- ✅ Edit detail page `src/app/(dashboard)/super-admin/companies/[id]/page.tsx` — logo upload, theme editor, danger zone
- ✅ Delete company: `DELETE /api/companies/{id}` → `CompanyService.delete()` cascades profiles, auth users, storage, audit logs

### SA Audit Log (`/super-admin/audit`)
- **Page:** `src/app/(dashboard)/super-admin/audit/page.tsx`
- ✅ Lists audit events: timestamp, user, company, action badge (green=create, blue=update, red=delete), resource type, item name
- ✅ Filters: company dropdown, resource type dropdown — updates URL params; applied in `AuditService.list()`
- ✅ Click row → right-side detail panel with diff table (Campo | Antes | Depois, color-coded changed fields)
- ✅ Diff skips non-meaningful fields: `id`, `created_at`, `updated_at`, `company_id`, `qr_code_token`
- ✅ All `auditService.log()` call sites pass `oldData` and `newData` — diff is populated correctly

### SA Calibration Documents (`/super-admin/calibration-documents`)
- ✅ In-page tutorial/guide always visible (steps 1–4, full placeholder variable reference)
- ✅ Upload template XLSX → `POST /api/calibration-documents` → creates `calibration_documents` record with `current_version=1`
- ✅ Version management: expandable "Versões (N)" per template; "Nova Versão" → `POST /api/calibration-documents/{id}/versions`
- ✅ Download current version → `GET /api/calibration-documents/{id}/download` → signed URL

---

## API Reference (Mobile / External Clients)

All API routes are under `/api/`. Auth is cookie-based (Supabase SSR). For mobile clients, exchange credentials via `POST /api/auth/login` to receive cookies, then include them on all subsequent requests. Use `GET /api/auth/refresh` to refresh the session.

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | `{ email, password }` → sets session cookie |
| POST | `/api/auth/signout` | Session | Clears session cookie |
| GET | `/api/auth/refresh` | Session | Refreshes session, returns updated user |
| POST | `/api/auth/callback` | Public | OAuth/magic-link callback handler |

### Equipment
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/api/equipment` | `equipment:read` | List with filters: `search`, `status`, `sort`, `page`, `limit`, `company_id` (SA only) |
| POST | `/api/equipment` | `equipment:create` | Create; `multipart/form-data` |
| GET | `/api/equipment/{id}` | `equipment:read` | Single equipment record |
| PATCH | `/api/equipment/{id}` | `equipment:update` | Partial update; audited |
| DELETE | `/api/equipment/{id}` | `equipment:delete` | Soft-deletes; audited |
| GET | `/api/equipment/{id}/qrcode` | `equipment:read` | PNG QR code |
| GET | `/api/equipment/qr/{token}` | Public | Resolves QR token → redirects to `/equipment/{id}` |
| POST | `/api/equipment/photo` | `equipment:create` | Upload equipment photo → `equipment-photos` bucket |
| GET | `/api/equipment/{id}/calibration-points` | `equipment:read` | List calibration points |
| POST | `/api/equipment/{id}/calibration-points` | `equipment:update` | Replace all calibration points |
| GET | `/api/equipment/{id}/calibrations` | `calibration:read` | List calibration records |
| POST | `/api/equipment/{id}/calibrations` | `calibration:register` | Register calibration (SA only) |
| GET | `/api/equipment/{id}/calibrations/{recordId}/download` | `calibration:read` | Download child XLSX (signed URL redirect) |
| POST | `/api/equipment/{id}/calibrations/{recordId}/certificate` | `calibration:register` | Upload certificate PDF/image |
| POST | `/api/equipment/{id}/copy-docs` | `equipment:create` | Copy documents from same-model equipment |
| GET | `/api/equipment/docs-by-model` | `equipment:read` | Query `?model=` — returns docs for that model |

### Tickets
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/api/tickets` | `ticket:read` | List with filters: `status`, `priority`, `equipment_id`, `search`, `page`, `limit`, `company_id` (SA) |
| POST | `/api/tickets` | `ticket:create` | Create ticket; `multipart/form-data` with optional photo |
| GET | `/api/tickets/{id}` | `ticket:read` | Single ticket with comments |
| PATCH | `/api/tickets/{id}` | `ticket:update` | Update `status`, `assigned_to`, `priority`; status transitions validated server-side |
| DELETE | `/api/tickets/{id}` | `ticket:delete` | Delete; audited |
| POST | `/api/tickets/{id}/comments` | `ticket:update` | Add comment `{ body }` |

### Documents
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/api/documents` | `document:read` | List with filters; employees auto-filtered to visible only; `company_id` param for SA |
| POST | `/api/documents` | SA only | Upload document; `multipart/form-data` (`file`, `name`, `company_id`, `category_id`, `equipment_id`) |
| GET | `/api/documents/{id}` | `document:read` | Single document with versions |
| PATCH | `/api/documents/{id}` | `document:update` | Update `visible_to_employees`, `name`, `description` |
| DELETE | `/api/documents/{id}` | `document:delete` | Deletes DB record and Storage object |
| GET | `/api/documents/{id}/download` | `document:read` | 60-second signed URL redirect |
| POST | `/api/documents/{id}/versions` | `document:update` | Upload new version; `multipart/form-data` (`file`, `notes`) |

### Document Categories
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/api/document-categories` | Session | List company's categories; `?company_id=` for SA |
| POST | `/api/document-categories` | `admin` or SA | Create category `{ name, description? }` |
| DELETE | `/api/document-categories/{id}` | `admin` or SA | Delete category |

### Users
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/api/users` | `user:read` | List users; filters `company_id`, `search`, `page` |
| GET | `/api/users/{id}` | `user:read` | Single user profile |
| PATCH | `/api/users/{id}` | `user:update` | Update `name`, `role` |
| PATCH | `/api/users/{id}/deactivate` | `user:update` | `{ is_active: boolean }` — cannot self-deactivate |
| POST | `/api/users/avatar` | Session | Upload avatar → `avatars` bucket |
| GET | `/api/users/{id}/permissions` | `user:read` | Get permission overrides |
| PUT | `/api/users/{id}/permissions` | `user:update` | Replace permission overrides `{ permissions: string[] }` |

### Companies
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/api/companies` | SA | List all companies |
| POST | `/api/companies` | SA | Create company + invite admin |
| GET | `/api/companies/{id}` | Session (own company or SA) | Get company record |
| PATCH | `/api/companies/{id}` | `company:update` | Update `name`, `cnpj`, `primary_color`, `secondary_color`, `accent_color`, `logo_url` |
| DELETE | `/api/companies/{id}` | SA | Delete company and all associated data |
| POST | `/api/companies/{id}/logo` | `company:update` | Upload logo → `company-assets` bucket |

### Notifications
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/api/notifications` | Session | List notifications (last 50); `?unread=1` for unread only |
| POST | `/api/notifications/{id}/read` | Session | Mark single notification read |
| POST | `/api/notifications/read-all` | Session | Mark all notifications read |
| GET | `/api/notifications/preferences` | Session | Get notification preferences |
| PATCH | `/api/notifications/preferences` | Session | Update `{ cal_alert?, unassigned?, weekly? }` |

### Invitations
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| POST | `/api/invitations` | `user:invite` | Invite user by email; `{ email, name, role, company_id }` |

### Calibration Documents (SA templates)
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/api/calibration-documents` | SA | List templates |
| POST | `/api/calibration-documents` | SA | Upload XLSX template |
| POST | `/api/calibration-documents/{id}/versions` | SA | Upload new template version |
| GET | `/api/calibration-documents/{id}/download` | SA | Signed URL redirect |

### Cron (internal)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cron/calibration-due` | `Authorization: Bearer $CRON_SECRET` | Sends `calibration_due` notifications for equipment due within 7 days |

---

## Performance Notes

All fixes are in `src/lib/auth/get-session.ts`, `src/lib/supabase/admin.ts`, `src/app/(dashboard)/dashboard/page.tsx`, `src/app/(dashboard)/layout.tsx`, and `src/lib/services/ticket.service.ts`.

### Fixed

| Issue | Fix | Estimated Saving |
|-------|-----|-----------------|
| `getUser()` network call on every page | Replaced with `getSession()` (local cookie read) | ~100–200ms per request |
| Sequential profile + permissions queries in `getServerSession` | `Promise.all([profileQuery, permissionsQuery, cookies()])` | ~20–50ms per request |
| New `createSupabaseAdminClient()` instance on every call | Module-level singleton (`let _adminClient`) | Eliminates connection pool re-allocation |
| Dashboard called `equipmentService.list()` twice (count + data) | Single call — `pagination.total` from data call already uses `count:"exact"` | One full DB round-trip per dashboard load |
| Layout fetched company theme on every soft navigation | `unstable_cache` (60s TTL, tag `company-theme`) + admin singleton | ~20–50ms per navigation after first load |
| `ticket.service.ts update()` called `repo.findById()` twice | Merged into single `before` fetch used for both validation and audit diff | One DB round-trip per ticket update |
| Proxy `middleware.ts` used `updateSession` (`getUser()` on every request) | Replaced with proper `proxy.ts` delegation using `getSession()` | ~100–200ms eliminated on every request |

**Overall estimated improvement:** ~140–300ms reduction in auth + theme critical path per page render.

### Not Yet Fixed (requires DB or infra changes)

- **Missing DB indexes** on `user_permissions.user_id` and `profiles.id` — without indexes, `getServerSession` performs sequential scans on both tables for every page render. Add: `CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);`
- **JWT custom claims** — carrying `role`, `company_id`, and `is_active` as Supabase custom claims via a `custom_access_token_hook` would eliminate both DB queries from `getServerSession` entirely for the common case.
- **Speculative permissions fetch for SA** — `user_permissions` is queried even for `super_admin` users whose result is always discarded. Moving back to conditional fetch for SA saves one query per SA request.
