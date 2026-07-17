-- Cuestionario propio ONUr de 18 preguntas, versión 2.
-- Los registros v1 se conservan y no se comparan automáticamente con v2.

alter table public.patient_assessments
  add column if not exists applicable_count smallint,
  add column if not exists general_rating smallint,
  add column if not exists falls_count smallint,
  add column if not exists walking_aid_used boolean;

update public.patient_assessments
set applicable_count = answered_count
where applicable_count is null;

alter table public.patient_assessments
  alter column applicable_count set default 0,
  alter column applicable_count set not null,
  alter column instrument_code set default 'ONUR_PERCEPCION_18',
  alter column instrument_version set default 2,
  drop constraint if exists patient_assessments_total_score_check,
  drop constraint if exists patient_assessments_answered_count_check;

alter table public.patient_assessments
  add constraint patient_assessments_total_score_check check (total_score between 0 and 54),
  add constraint patient_assessments_answered_count_check check (answered_count between 0 and 18),
  add constraint patient_assessments_applicable_count_check check (applicable_count between 0 and answered_count),
  add constraint patient_assessments_v2_version_check check (instrument_code <> 'ONUR_PERCEPCION_18' or instrument_version = 2),
  add constraint patient_assessments_general_rating_check check (general_rating is null or general_rating between 0 and 10),
  add constraint patient_assessments_falls_count_check check (falls_count is null or falls_count >= 0);

comment on column public.patient_assessments.applicable_count is 'Respuestas numéricas; excluye No aplica y valores no transcritos.';
comment on column public.patient_assessments.general_rating is 'Valoración general autoinformada de 0 a 10; no es un punto de corte clínico.';
