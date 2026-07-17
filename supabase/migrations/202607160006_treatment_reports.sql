-- Informes versionados por ciclo. Cada versión conserva una instantánea descriptiva.

create table public.treatment_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  treatment_cycle_id uuid not null references public.treatment_cycles (id) on delete cascade,
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'final')),
  professional_summary text,
  snapshot jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (treatment_cycle_id, version)
);

create index treatment_reports_patient_cycle_idx
on public.treatment_reports (patient_id, treatment_cycle_id, version desc);

create trigger treatment_reports_set_updated_at before update on public.treatment_reports
for each row execute function public.set_updated_at();

alter table public.treatment_reports enable row level security;

create policy treatment_reports_professional_all on public.treatment_reports
for all to authenticated
using (public.owns_patient(patient_id) and public.is_professional())
with check (public.owns_patient(patient_id) and public.is_professional());

grant select, insert, update, delete on public.treatment_reports to authenticated;
