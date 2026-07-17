-- Registro versionado de la confirmación de uso del portal.
-- No sustituye consentimiento clínico ni asesoramiento legal profesional.

create table public.patient_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  document_code text not null,
  document_version text not null,
  accepted_at timestamptz not null default now(),
  accepted_by uuid not null references auth.users (id),
  unique (patient_id, document_code, document_version)
);

create index patient_acknowledgements_patient_idx on public.patient_acknowledgements (patient_id, accepted_at desc);

alter table public.patient_acknowledgements enable row level security;

create policy acknowledgements_patient_select on public.patient_acknowledgements
for select to authenticated using (public.is_patient_self(patient_id));

create policy acknowledgements_professional_select on public.patient_acknowledgements
for select to authenticated using (public.owns_patient(patient_id) and public.is_professional());

grant select on public.patient_acknowledgements to authenticated;

create or replace function public.accept_patient_acknowledgement(
  document_code_input text,
  document_version_input text
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_patient_id uuid;
  acceptance_time timestamptz;
begin
  if document_code_input <> 'PORTAL_USE' or document_version_input <> '1.0-beta' then
    raise exception 'Documento de aceptación no válido.' using errcode = '22023';
  end if;

  select patient.id into target_patient_id
  from public.patients patient
  where public.is_patient_self(patient.id);

  if target_patient_id is null then
    raise exception 'Cuenta de paciente no disponible.' using errcode = '42501';
  end if;

  insert into public.patient_acknowledgements (
    patient_id, document_code, document_version, accepted_by
  ) values (
    target_patient_id, document_code_input, document_version_input, auth.uid()
  )
  on conflict (patient_id, document_code, document_version)
  do update set accepted_at = public.patient_acknowledgements.accepted_at
  returning accepted_at into acceptance_time;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'patient_acknowledgement_accepted', 'patient', target_patient_id,
    jsonb_build_object('document_code', document_code_input, 'document_version', document_version_input));

  return acceptance_time;
end;
$$;

revoke all on function public.accept_patient_acknowledgement(text, text) from public;
grant execute on function public.accept_patient_acknowledgement(text, text) to authenticated;
