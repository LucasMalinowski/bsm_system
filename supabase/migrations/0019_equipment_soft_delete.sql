-- Equipment "delete" must not destroy calibration history (compliance records).
-- equipment_calibration_points and calibration_records both cascade-delete on
-- equipment_id, so a hard delete was silently wiping calibration history.
-- Switch to soft-delete: mark deleted_at instead of removing the row.
alter table public.equipment add column if not exists deleted_at timestamptz;

create index if not exists idx_equipment_deleted_at on public.equipment(deleted_at);
