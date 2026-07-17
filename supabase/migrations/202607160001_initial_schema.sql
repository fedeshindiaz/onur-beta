-- ONUr 1.0 Beta · esquema inicial
-- Los datos de demostración del frontend no se insertan aquí.

create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('professional', 'patient');
create type public.patient_status as enum ('active', 'inactive');
create type public.cycle_status as enum ('active', 'paused', 'completed');
create type public.study_status as enum ('draft', 'reviewed', 'finalized');
create type public.quality_status as enum ('ok', 'review', 'quarantine', 'blocked', 'not_applicable');
create type public.suggestion_status as enum ('pending', 'accepted', 'edited', 'discarded');
create type public.session_status as enum ('assigned', 'started', 'completed', 'partial', 'interrupted', 'omitted', 'revoked');
create type public.permission_level as enum ('view', 'view_download');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references auth.users (id),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  birth_date date,
  insurer text,
  affiliate_number text,
  phone text,
  status public.patient_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  constraint patient_deactivation_consistent check (
    (status = 'active' and deactivated_at is null)
    or status = 'inactive'
  )
);

comment on column public.patients.auth_user_id is 'Relación con Auth; no contiene nombre de usuario, cédula ni PIN.';

create table public.patient_private_notes (
  patient_id uuid primary key references public.patients (id) on delete cascade,
  notes text not null default '',
  updated_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.patient_private_notes is 'Contenido exclusivo del profesional; nunca se expone al portal del paciente.';

create table public.patient_portal_accounts (
  patient_id uuid primary key references public.patients (id) on delete cascade,
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  username_normalized text not null unique,
  auth_login_email text not null unique,
  must_change_pin boolean not null default true,
  enabled boolean not null default true,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_normalized_format check (username_normalized ~ '^[a-z0-9]{4,40}$')
);

comment on table public.patient_portal_accounts is 'Nunca almacena cédula, PIN ni secreto derivado. auth_login_email es interno y no se expone al cliente.';

create table public.treatment_cycles (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  label text not null,
  reason text,
  objectives text,
  status public.cycle_status not null default 'active',
  started_on date not null,
  ended_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint treatment_cycle_dates check (ended_on is null or ended_on >= started_on)
);

create table public.source_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  treatment_cycle_id uuid references public.treatment_cycles (id) on delete set null,
  document_type text not null,
  original_filename text not null,
  storage_path text not null unique,
  mime_type text not null,
  sha256 text,
  uploaded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.clinical_studies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  treatment_cycle_id uuid references public.treatment_cycles (id) on delete set null,
  source_document_id uuid references public.source_documents (id) on delete set null,
  study_type text not null,
  performed_at timestamptz not null,
  device_name text,
  software_version text,
  protocol_code text not null,
  protocol_version text not null,
  status public.study_status not null default 'draft',
  clinical_context text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.metric_values (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.clinical_studies (id) on delete cascade,
  metric_code text not null,
  raw_value text not null,
  normalized_numeric_value numeric,
  normalized_text_value text,
  unit_code text,
  condition_code text,
  side text check (side is null or side in ('left', 'right', 'bilateral', 'unknown')),
  axis text,
  trial_number integer check (trial_number is null or trial_number > 0),
  source_method text not null check (source_method in ('imported', 'ocr', 'transcribed', 'calculated', 'manual')),
  source_location text,
  normalization_rule_version text,
  quality_status public.quality_status not null default 'review',
  verified_by uuid references auth.users (id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint one_normalized_value check (
    normalized_numeric_value is null or normalized_text_value is null
  )
);

create table public.data_quality_issues (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.clinical_studies (id) on delete cascade,
  metric_value_id uuid references public.metric_values (id) on delete cascade,
  rule_code text not null,
  severity public.quality_status not null,
  message text not null,
  resolution text,
  resolved_by uuid references auth.users (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.statistical_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version integer not null check (version > 0),
  title text not null,
  domain text not null,
  formula_definition jsonb not null default '{}'::jsonb,
  reference_definition jsonb not null default '{}'::jsonb,
  limitations text not null,
  status text not null check (status in ('draft', 'approved', 'retired', 'blocked')),
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (code, version)
);

create table public.statistical_suggestions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  study_id uuid not null references public.clinical_studies (id) on delete cascade,
  rule_id uuid not null references public.statistical_rules (id),
  input_metric_ids uuid[] not null default '{}',
  observed_result jsonb not null,
  statistical_message text not null,
  limitations text not null,
  status public.suggestion_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.professional_reviews (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null unique references public.statistical_suggestions (id) on delete cascade,
  professional_id uuid not null references auth.users (id),
  decision public.suggestion_status not null check (decision <> 'pending'),
  professional_text text,
  reviewed_at timestamptz not null default now()
);

create table public.session_plans (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references auth.users (id),
  title text not null,
  instructions text,
  plan_definition jsonb not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.session_assignments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  treatment_cycle_id uuid references public.treatment_cycles (id) on delete set null,
  session_plan_id uuid not null references public.session_plans (id),
  available_from timestamptz not null,
  available_until timestamptz,
  max_completions integer not null default 1 check (max_completions > 0),
  status public.session_status not null default 'assigned',
  assigned_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint assignment_dates check (available_until is null or available_until >= available_from)
);

create table public.session_executions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.session_assignments (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  status public.session_status not null default 'started',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  active_seconds integer not null default 0 check (active_seconds >= 0),
  initial_discomfort smallint check (initial_discomfort between 0 and 10),
  final_discomfort smallint check (final_discomfort between 0 and 10),
  perceived_difficulty smallint check (perceived_difficulty between 1 and 5),
  patient_comment text,
  event_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint execution_dates check (finished_at is null or finished_at >= started_at)
);

create table public.document_permissions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  document_id uuid not null references public.source_documents (id) on delete cascade,
  level public.permission_level not null,
  granted_by uuid not null references auth.users (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (patient_id, document_id)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index patients_professional_id_idx on public.patients (professional_id);
create index treatment_cycles_patient_id_idx on public.treatment_cycles (patient_id);
create index source_documents_patient_id_idx on public.source_documents (patient_id);
create index clinical_studies_patient_id_date_idx on public.clinical_studies (patient_id, performed_at desc);
create index metric_values_study_id_idx on public.metric_values (study_id);
create index quality_issues_study_id_idx on public.data_quality_issues (study_id);
create index suggestions_patient_status_idx on public.statistical_suggestions (patient_id, status);
create index assignments_patient_availability_idx on public.session_assignments (patient_id, available_from desc);
create index executions_assignment_id_idx on public.session_executions (assignment_id);
create index document_permissions_patient_id_idx on public.document_permissions (patient_id) where revoked_at is null;
create index audit_events_entity_idx on public.audit_events (entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger patients_set_updated_at before update on public.patients
for each row execute function public.set_updated_at();
create trigger patient_private_notes_set_updated_at before update on public.patient_private_notes
for each row execute function public.set_updated_at();
create trigger portal_accounts_set_updated_at before update on public.patient_portal_accounts
for each row execute function public.set_updated_at();
create trigger cycles_set_updated_at before update on public.treatment_cycles
for each row execute function public.set_updated_at();
create trigger studies_set_updated_at before update on public.clinical_studies
for each row execute function public.set_updated_at();
create trigger suggestions_set_updated_at before update on public.statistical_suggestions
for each row execute function public.set_updated_at();
create trigger plans_set_updated_at before update on public.session_plans
for each row execute function public.set_updated_at();
create trigger executions_set_updated_at before update on public.session_executions
for each row execute function public.set_updated_at();

create or replace function public.validate_session_execution_assignment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.session_assignments assignment
    where assignment.id = new.assignment_id
      and assignment.patient_id = new.patient_id
  ) then
    raise exception 'La asignación no pertenece al paciente indicado.';
  end if;
  return new;
end;
$$;

create trigger executions_validate_assignment
before insert or update of assignment_id, patient_id on public.session_executions
for each row execute function public.validate_session_execution_assignment();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  assigned_role public.user_role;
begin
  assigned_role := case
    when new.raw_app_meta_data ->> 'role' = 'professional' then 'professional'::public.user_role
    else 'patient'::public.user_role
  end;

  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    assigned_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Usuario ONUr')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.is_professional()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'professional'
  );
$$;

create or replace function public.owns_patient(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.patients
    where id = target_patient_id and professional_id = auth.uid()
  );
$$;

create or replace function public.is_patient_self(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.patients
    where id = target_patient_id and auth_user_id = auth.uid()
  );
$$;

revoke all on function public.is_professional() from public;
revoke all on function public.owns_patient(uuid) from public;
revoke all on function public.is_patient_self(uuid) from public;
grant execute on function public.is_professional() to authenticated;
grant execute on function public.owns_patient(uuid) to authenticated;
grant execute on function public.is_patient_self(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.patient_private_notes enable row level security;
alter table public.patient_portal_accounts enable row level security;
alter table public.treatment_cycles enable row level security;
alter table public.source_documents enable row level security;
alter table public.clinical_studies enable row level security;
alter table public.metric_values enable row level security;
alter table public.data_quality_issues enable row level security;
alter table public.statistical_rules enable row level security;
alter table public.statistical_suggestions enable row level security;
alter table public.professional_reviews enable row level security;
alter table public.session_plans enable row level security;
alter table public.session_assignments enable row level security;
alter table public.session_executions enable row level security;
alter table public.document_permissions enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_select_self on public.profiles
for select to authenticated using (id = auth.uid());
create policy profiles_update_self on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy patients_professional_select on public.patients
for select to authenticated using (professional_id = auth.uid());
create policy patients_professional_insert on public.patients
for insert to authenticated with check (professional_id = auth.uid() and public.is_professional());
create policy patients_professional_update on public.patients
for update to authenticated using (professional_id = auth.uid()) with check (professional_id = auth.uid());
create policy patients_professional_delete on public.patients
for delete to authenticated using (professional_id = auth.uid());
create policy patients_self_select on public.patients
for select to authenticated using (auth_user_id = auth.uid());

create policy patient_private_notes_professional_all on public.patient_private_notes
for all to authenticated
using (public.owns_patient(patient_id) and public.is_professional())
with check (public.owns_patient(patient_id) and public.is_professional());

create policy portal_accounts_professional_select on public.patient_portal_accounts
for select to authenticated using (public.owns_patient(patient_id));

create policy cycles_professional_all on public.treatment_cycles
for all to authenticated using (public.owns_patient(patient_id)) with check (public.owns_patient(patient_id));

create policy source_documents_professional_select on public.source_documents
for select to authenticated using (public.owns_patient(patient_id));
create policy source_documents_professional_insert on public.source_documents
for insert to authenticated with check (public.owns_patient(patient_id));
create policy source_documents_patient_permitted on public.source_documents
for select to authenticated using (
  public.is_patient_self(patient_id)
  and exists (
    select 1 from public.document_permissions permission
    where permission.document_id = source_documents.id
      and permission.patient_id = source_documents.patient_id
      and permission.revoked_at is null
  )
);

create policy studies_professional_all on public.clinical_studies
for all to authenticated using (public.owns_patient(patient_id)) with check (public.owns_patient(patient_id));

create policy metric_values_professional_all on public.metric_values
for all to authenticated using (
  exists (
    select 1 from public.clinical_studies study
    where study.id = metric_values.study_id and public.owns_patient(study.patient_id)
  )
) with check (
  exists (
    select 1 from public.clinical_studies study
    where study.id = metric_values.study_id and public.owns_patient(study.patient_id)
  )
);

create policy quality_issues_professional_all on public.data_quality_issues
for all to authenticated using (
  exists (
    select 1 from public.clinical_studies study
    where study.id = data_quality_issues.study_id and public.owns_patient(study.patient_id)
  )
) with check (
  exists (
    select 1 from public.clinical_studies study
    where study.id = data_quality_issues.study_id and public.owns_patient(study.patient_id)
  )
);

create policy rules_professional_select on public.statistical_rules
for select to authenticated using (public.is_professional());

create policy suggestions_professional_all on public.statistical_suggestions
for all to authenticated using (public.owns_patient(patient_id)) with check (public.owns_patient(patient_id));

create policy reviews_professional_all on public.professional_reviews
for all to authenticated
using (professional_id = auth.uid() and public.is_professional())
with check (professional_id = auth.uid() and public.is_professional());

create policy plans_professional_all on public.session_plans
for all to authenticated
using (professional_id = auth.uid() and public.is_professional())
with check (professional_id = auth.uid() and public.is_professional());
create policy plans_patient_assigned_select on public.session_plans
for select to authenticated using (
  exists (
    select 1
    from public.session_assignments assignment
    where assignment.session_plan_id = session_plans.id
      and public.is_patient_self(assignment.patient_id)
      and assignment.status <> 'revoked'
  )
);

create policy assignments_professional_all on public.session_assignments
for all to authenticated using (public.owns_patient(patient_id)) with check (public.owns_patient(patient_id));
create policy assignments_patient_select on public.session_assignments
for select to authenticated using (public.is_patient_self(patient_id));

create policy executions_professional_select on public.session_executions
for select to authenticated using (public.owns_patient(patient_id));
create policy executions_patient_select on public.session_executions
for select to authenticated using (public.is_patient_self(patient_id));
create policy executions_patient_insert on public.session_executions
for insert to authenticated with check (
  public.is_patient_self(patient_id)
  and exists (
    select 1 from public.session_assignments assignment
    where assignment.id = assignment_id
      and assignment.patient_id = session_executions.patient_id
      and assignment.status <> 'revoked'
  )
);
create policy executions_patient_update on public.session_executions
for update to authenticated
using (public.is_patient_self(patient_id))
with check (
  public.is_patient_self(patient_id)
  and exists (
    select 1 from public.session_assignments assignment
    where assignment.id = assignment_id
      and assignment.patient_id = session_executions.patient_id
      and assignment.status <> 'revoked'
  )
);

create policy permissions_professional_all on public.document_permissions
for all to authenticated using (public.owns_patient(patient_id)) with check (public.owns_patient(patient_id));
create policy permissions_patient_select on public.document_permissions
for select to authenticated using (public.is_patient_self(patient_id) and revoked_at is null);

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.patients to authenticated;
grant select, insert, update, delete on public.patient_private_notes to authenticated;
grant select (
  patient_id,
  auth_user_id,
  username_normalized,
  must_change_pin,
  enabled,
  failed_attempts,
  locked_until,
  last_login_at,
  created_at,
  updated_at
) on public.patient_portal_accounts to authenticated;
grant select, insert, update, delete on public.treatment_cycles to authenticated;
grant select, insert on public.source_documents to authenticated;
grant select, insert, update, delete on public.clinical_studies to authenticated;
grant select, insert, update, delete on public.metric_values to authenticated;
grant select, insert, update, delete on public.data_quality_issues to authenticated;
grant select on public.statistical_rules to authenticated;
grant select, insert, update, delete on public.statistical_suggestions to authenticated;
grant select, insert, update, delete on public.professional_reviews to authenticated;
grant select, insert, update, delete on public.session_plans to authenticated;
grant select, insert, update, delete on public.session_assignments to authenticated;
grant select, insert, update on public.session_executions to authenticated;
grant select, insert, update, delete on public.document_permissions to authenticated;

-- patient_portal_accounts y audit_events se modifican únicamente mediante funciones de servidor con service_role.
