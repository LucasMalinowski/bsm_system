-- H1: tag/escala were requested as calibration-spreadsheet placeholders but had
-- no backing column at all (unlike brand/model/serial_number, which already
-- existed and just needed to be selected). Add them so they can be set on
-- equipment and substituted into calibration templates.
alter table public.equipment
  add column if not exists tag text,
  add column if not exists scale text;
