-- Cuestionarios físicos transcritos por el profesional.

create type public.assessment_phase as enum ('initial', 'final', 'follow_up');

create table public.patient_assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  treatment_cycle_id uuid references public.treatment_cycles (id) on delete set null,
  source_document_id uuid references public.source_documents (id) on delete set null,
  instrument_code text not null default 'ONUR_PERCEPCION_12',
  instrument_version integer not null default 1 check (instrument_version > 0),
  phase public.assessment_phase not null,
  assessment_date date not null,
  responses jsonb not null default '{}'::jsonb,
  total_score smallint not null check (total_score between 0 and 48),
  answered_count smallint not null check (answered_count between 0 and 12),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patient_assessments_patient_cycle_idx
on public.patient_assessments (patient_id, treatment_cycle_id, assessment_date desc);

create trigger patient_assessments_set_updated_at before update on public.patient_assessments
for each row execute function public.set_updated_at();

alter table public.patient_assessments enable row level security;

create policy patient_assessments_professional_all on public.patient_assessments
for all to authenticated
using (public.owns_patient(patient_id) and public.is_professional())
with check (public.owns_patient(patient_id) and public.is_professional());

grant select, insert, update, delete on public.patient_assessments to authenticated;
