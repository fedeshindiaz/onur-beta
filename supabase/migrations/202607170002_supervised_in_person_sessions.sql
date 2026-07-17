-- Ejecución presencial supervisada desde la sesión autenticada del profesional.
-- Mantiene separadas las capacidades del portal domiciliario del paciente.

alter table public.session_executions
  add column if not exists execution_mode text not null default 'home'
    check (execution_mode in ('home', 'in_person')),
  add column if not exists supervised boolean not null default false,
  add column if not exists operated_by uuid references auth.users (id),
  add column if not exists professional_observation text;

create unique index if not exists one_open_supervised_execution_per_assignment
on public.session_executions (assignment_id)
where supervised and finished_at is null;

create or replace function public.can_patient_access_home_session_plan(target_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.session_plans plan
    join public.session_assignments assignment on assignment.session_plan_id = plan.id
    where plan.id = target_plan_id
      and coalesce(plan.plan_definition ->> 'mode', 'home') = 'home'
      and public.is_patient_self(assignment.patient_id)
      and assignment.status <> 'revoked'
  );
$$;

revoke all on function public.can_patient_access_home_session_plan(uuid) from public;
grant execute on function public.can_patient_access_home_session_plan(uuid) to authenticated;

-- El portal del paciente no puede resolver asignaciones, planes ni ejecuciones presenciales.
drop policy if exists plans_patient_assigned_select on public.session_plans;
create policy plans_patient_assigned_select on public.session_plans
for select to authenticated using (
  public.can_patient_access_home_session_plan(session_plans.id)
);

drop policy if exists assignments_patient_select on public.session_assignments;
create policy assignments_patient_select on public.session_assignments
for select to authenticated using (
  public.is_patient_self(patient_id)
  and public.can_patient_access_home_session_plan(session_plan_id)
);

drop policy if exists executions_patient_select on public.session_executions;
create policy executions_patient_select on public.session_executions
for select to authenticated using (
  public.is_patient_self(patient_id)
  and execution_mode = 'home'
  and not supervised
);

-- Las funciones domiciliarias existentes conservan sus restricciones y además
-- rechazan explícitamente cualquier asignación presencial.
create or replace function public.start_session_assignment(target_assignment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_patient_id uuid;
  previous_status public.session_status;
begin
  select assignment_row.patient_id, assignment_row.status
  into target_patient_id, previous_status
  from public.session_assignments assignment_row
  join public.session_plans plan on plan.id = assignment_row.session_plan_id
  where assignment_row.id = target_assignment_id
    and public.is_patient_self(assignment_row.patient_id)
    and coalesce(plan.plan_definition ->> 'mode', 'home') = 'home'
    and assignment_row.status in ('assigned', 'started')
    and assignment_row.available_from <= now()
    and (assignment_row.available_until is null or assignment_row.available_until >= now())
  for update of assignment_row;

  if target_patient_id is null then
    raise exception 'Asignación domiciliaria no disponible.' using errcode = '42501';
  end if;

  if previous_status = 'assigned' then
    update public.session_assignments set status = 'started' where id = target_assignment_id;
    insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(),
      'session_started',
      'session_assignment',
      target_assignment_id,
      jsonb_build_object('mode', 'home', 'supervised', false)
    );
  end if;
  return target_assignment_id;
end;
$$;

revoke all on function public.start_session_assignment(uuid) from public;
grant execute on function public.start_session_assignment(uuid) to authenticated;

create or replace function public.complete_session_assignment_v2(
  target_assignment_id uuid,
  active_seconds_input integer,
  skipped_count_input integer default 0,
  initial_discomfort_input integer default null,
  final_discomfort_input integer default null,
  perceived_difficulty_input integer default null,
  patient_comment_input text default null,
  event_log_input jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_patient_id uuid;
  execution_id uuid;
  final_status public.session_status;
begin
  if active_seconds_input is null or active_seconds_input not between 0 and 86400 or skipped_count_input is null or skipped_count_input not between 0 and 100 then
    raise exception 'Datos de ejecución fuera de rango.' using errcode = '22023';
  end if;
  if initial_discomfort_input is null or initial_discomfort_input not between 0 and 10 then
    raise exception 'El malestar inicial debe estar entre 0 y 10.' using errcode = '22023';
  end if;
  if final_discomfort_input is null or final_discomfort_input not between 0 and 10 then
    raise exception 'El malestar final debe estar entre 0 y 10.' using errcode = '22023';
  end if;
  if perceived_difficulty_input is null or perceived_difficulty_input not between 1 and 5 then
    raise exception 'La dificultad percibida debe estar entre 1 y 5.' using errcode = '22023';
  end if;
  if length(coalesce(patient_comment_input, '')) > 500 then
    raise exception 'El comentario supera el máximo de 500 caracteres.' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(event_log_input, '[]'::jsonb)) <> 'array' or pg_column_size(coalesce(event_log_input, '[]'::jsonb)) > 32768 then
    raise exception 'Registro de eventos no válido.' using errcode = '22023';
  end if;

  select assignment_row.patient_id
  into target_patient_id
  from public.session_assignments assignment_row
  join public.session_plans plan on plan.id = assignment_row.session_plan_id
  where assignment_row.id = target_assignment_id
    and public.is_patient_self(assignment_row.patient_id)
    and coalesce(plan.plan_definition ->> 'mode', 'home') = 'home'
    and assignment_row.status in ('assigned', 'started')
    and assignment_row.available_from <= now()
    and (assignment_row.status = 'started' or assignment_row.available_until is null or assignment_row.available_until >= now())
  for update of assignment_row;

  if target_patient_id is null then
    raise exception 'Asignación domiciliaria no disponible.' using errcode = '42501';
  end if;

  final_status := case when greatest(0, skipped_count_input) > 0
    then 'partial'::public.session_status
    else 'completed'::public.session_status
  end;

  insert into public.session_executions (
    assignment_id,
    patient_id,
    status,
    finished_at,
    active_seconds,
    initial_discomfort,
    final_discomfort,
    perceived_difficulty,
    patient_comment,
    event_log,
    execution_mode,
    supervised
  ) values (
    target_assignment_id,
    target_patient_id,
    final_status,
    now(),
    greatest(0, active_seconds_input),
    initial_discomfort_input,
    final_discomfort_input,
    perceived_difficulty_input,
    nullif(trim(patient_comment_input), ''),
    coalesce(event_log_input, '[]'::jsonb),
    'home',
    false
  ) returning id into execution_id;

  update public.session_assignments
  set status = final_status
  where id = target_assignment_id;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'session_finished',
    'session_assignment',
    target_assignment_id,
    jsonb_build_object(
      'mode', 'home',
      'supervised', false,
      'status', final_status,
      'skipped_exercises', greatest(0, skipped_count_input)
    )
  );

  return execution_id;
end;
$$;

revoke all on function public.complete_session_assignment_v2(uuid, integer, integer, integer, integer, integer, text, jsonb) from public;
grant execute on function public.complete_session_assignment_v2(uuid, integer, integer, integer, integer, integer, text, jsonb) to authenticated;

create or replace function public.start_supervised_in_person_session(
  target_assignment_id uuid,
  initial_discomfort_input integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_patient_id uuid;
  previous_status public.session_status;
  execution_id uuid;
  was_restart boolean;
begin
  if initial_discomfort_input is null or initial_discomfort_input not between 0 and 10 then
    raise exception 'El malestar inicial debe estar entre 0 y 10.' using errcode = '22023';
  end if;

  select assignment_row.patient_id, assignment_row.status
  into target_patient_id, previous_status
  from public.session_assignments assignment_row
  join public.session_plans plan on plan.id = assignment_row.session_plan_id
  where assignment_row.id = target_assignment_id
    and public.is_professional()
    and public.owns_patient(assignment_row.patient_id)
    and coalesce(plan.plan_definition ->> 'mode', 'home') = 'in_person'
    and assignment_row.status in ('assigned', 'started')
  for update of assignment_row;

  if target_patient_id is null then
    raise exception 'Asignación presencial no disponible para este profesional.' using errcode = '42501';
  end if;

  select execution.id
  into execution_id
  from public.session_executions execution
  where execution.assignment_id = target_assignment_id
    and execution.supervised
    and execution.finished_at is null
  order by execution.created_at desc
  limit 1
  for update;

  was_restart := previous_status = 'started' or execution_id is not null;

  if execution_id is null then
    insert into public.session_executions (
      assignment_id,
      patient_id,
      status,
      started_at,
      active_seconds,
      initial_discomfort,
      event_log,
      execution_mode,
      supervised,
      operated_by
    ) values (
      target_assignment_id,
      target_patient_id,
      'started',
      now(),
      0,
      initial_discomfort_input,
      jsonb_build_array(jsonb_build_object('type', 'started', 'at', now())),
      'in_person',
      true,
      auth.uid()
    ) returning id into execution_id;
  else
    update public.session_executions
    set status = 'started',
        started_at = now(),
        finished_at = null,
        active_seconds = 0,
        initial_discomfort = initial_discomfort_input,
        final_discomfort = null,
        perceived_difficulty = null,
        patient_comment = null,
        professional_observation = null,
        event_log = jsonb_build_array(jsonb_build_object('type', 'restarted_from_beginning', 'at', now())),
        execution_mode = 'in_person',
        supervised = true,
        operated_by = auth.uid()
    where id = execution_id;
  end if;

  update public.session_assignments set status = 'started' where id = target_assignment_id;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    case when was_restart then 'supervised_in_person_session_restarted' else 'supervised_in_person_session_started' end,
    'session_assignment',
    target_assignment_id,
    jsonb_build_object(
      'execution_id', execution_id,
      'patient_id', target_patient_id,
      'mode', 'in_person',
      'supervised', true,
      'operated_by', auth.uid(),
      'initial_discomfort', initial_discomfort_input,
      'restarted_from_beginning', was_restart
    )
  );

  return execution_id;
end;
$$;

revoke all on function public.start_supervised_in_person_session(uuid, integer) from public;
grant execute on function public.start_supervised_in_person_session(uuid, integer) to authenticated;

create or replace function public.complete_supervised_in_person_session(
  target_assignment_id uuid,
  active_seconds_input integer,
  skipped_count_input integer default 0,
  final_discomfort_input integer default null,
  perceived_difficulty_input integer default null,
  patient_comment_input text default null,
  professional_observation_input text default null,
  event_log_input jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_patient_id uuid;
  execution_id uuid;
  initial_discomfort_value integer;
  final_status public.session_status;
begin
  if active_seconds_input is null or active_seconds_input not between 0 and 86400 or skipped_count_input is null or skipped_count_input not between 0 and 100 then
    raise exception 'Datos de ejecución fuera de rango.' using errcode = '22023';
  end if;
  if final_discomfort_input is null or final_discomfort_input not between 0 and 10 then
    raise exception 'El malestar final debe estar entre 0 y 10.' using errcode = '22023';
  end if;
  if perceived_difficulty_input is null or perceived_difficulty_input not between 1 and 5 then
    raise exception 'La dificultad percibida debe estar entre 1 y 5.' using errcode = '22023';
  end if;
  if length(coalesce(patient_comment_input, '')) > 500 then
    raise exception 'El comentario del paciente supera el máximo de 500 caracteres.' using errcode = '22023';
  end if;
  if length(coalesce(professional_observation_input, '')) > 2000 then
    raise exception 'La observación profesional supera el máximo de 2000 caracteres.' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(event_log_input, '[]'::jsonb)) <> 'array' or pg_column_size(coalesce(event_log_input, '[]'::jsonb)) > 32768 then
    raise exception 'Registro de eventos no válido.' using errcode = '22023';
  end if;

  select assignment_row.patient_id
  into target_patient_id
  from public.session_assignments assignment_row
  join public.session_plans plan on plan.id = assignment_row.session_plan_id
  where assignment_row.id = target_assignment_id
    and public.is_professional()
    and public.owns_patient(assignment_row.patient_id)
    and coalesce(plan.plan_definition ->> 'mode', 'home') = 'in_person'
    and assignment_row.status = 'started'
  for update of assignment_row;

  if target_patient_id is null then
    raise exception 'Asignación presencial iniciada no disponible para este profesional.' using errcode = '42501';
  end if;

  select execution.id, execution.initial_discomfort
  into execution_id, initial_discomfort_value
  from public.session_executions execution
  where execution.assignment_id = target_assignment_id
    and execution.patient_id = target_patient_id
    and execution.execution_mode = 'in_person'
    and execution.supervised
    and execution.operated_by = auth.uid()
    and execution.finished_at is null
  order by execution.created_at desc
  limit 1
  for update;

  if execution_id is null or initial_discomfort_value is null then
    raise exception 'No existe una ejecución presencial abierta por este profesional.' using errcode = '42501';
  end if;

  final_status := case when greatest(0, skipped_count_input) > 0
    then 'partial'::public.session_status
    else 'completed'::public.session_status
  end;

  update public.session_executions
  set status = final_status,
      finished_at = now(),
      active_seconds = greatest(0, active_seconds_input),
      final_discomfort = final_discomfort_input,
      perceived_difficulty = perceived_difficulty_input,
      patient_comment = nullif(trim(patient_comment_input), ''),
      professional_observation = nullif(trim(professional_observation_input), ''),
      event_log = event_log || coalesce(event_log_input, '[]'::jsonb)
  where id = execution_id;

  update public.session_assignments set status = final_status where id = target_assignment_id;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'supervised_in_person_session_finished',
    'session_assignment',
    target_assignment_id,
    jsonb_build_object(
      'execution_id', execution_id,
      'patient_id', target_patient_id,
      'mode', 'in_person',
      'supervised', true,
      'operated_by', auth.uid(),
      'status', final_status,
      'skipped_exercises', greatest(0, skipped_count_input),
      'initial_discomfort', initial_discomfort_value,
      'final_discomfort', final_discomfort_input,
      'perceived_difficulty', perceived_difficulty_input
    )
  );

  return execution_id;
end;
$$;

revoke all on function public.complete_supervised_in_person_session(uuid, integer, integer, integer, integer, text, text, jsonb) from public;
grant execute on function public.complete_supervised_in_person_session(uuid, integer, integer, integer, integer, text, text, jsonb) to authenticated;

create or replace function public.duplicate_in_person_assignment_as_home(target_assignment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  source_patient_id uuid;
  source_treatment_cycle_id uuid;
  source_max_completions integer;
  source_title text;
  source_instructions text;
  source_definition jsonb;
  new_plan_id uuid;
  new_assignment_id uuid;
begin
  select assignment_row.patient_id,
         assignment_row.treatment_cycle_id,
         assignment_row.max_completions,
         plan.title,
         plan.instructions,
         plan.plan_definition
  into source_patient_id,
       source_treatment_cycle_id,
       source_max_completions,
       source_title,
       source_instructions,
       source_definition
  from public.session_assignments assignment_row
  join public.session_plans plan on plan.id = assignment_row.session_plan_id
  where assignment_row.id = target_assignment_id
    and public.is_professional()
    and public.owns_patient(assignment_row.patient_id)
    and coalesce(plan.plan_definition ->> 'mode', 'home') = 'in_person'
    and assignment_row.status <> 'revoked'
  for update of assignment_row;

  if source_patient_id is null then
    raise exception 'Asignación presencial no disponible para duplicar.' using errcode = '42501';
  end if;

  insert into public.session_plans (professional_id, title, instructions, plan_definition)
  values (
    auth.uid(),
    source_title || ' (domiciliaria)',
    source_instructions,
    coalesce(source_definition, '{}'::jsonb) || jsonb_build_object('mode', 'home')
  )
  returning id into new_plan_id;

  insert into public.session_assignments (
    patient_id,
    treatment_cycle_id,
    session_plan_id,
    available_from,
    available_until,
    max_completions,
    status,
    assigned_by
  ) values (
    source_patient_id,
    source_treatment_cycle_id,
    new_plan_id,
    now(),
    null,
    source_max_completions,
    'assigned',
    auth.uid()
  )
  returning id into new_assignment_id;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'session_assignment_duplicated_as_home',
    'session_assignment',
    new_assignment_id,
    jsonb_build_object(
      'source_assignment_id', target_assignment_id,
      'patient_id', source_patient_id,
      'source_mode', 'in_person',
      'target_mode', 'home'
    )
  );

  return new_assignment_id;
end;
$$;

revoke all on function public.duplicate_in_person_assignment_as_home(uuid) from public;
grant execute on function public.duplicate_in_person_assignment_as_home(uuid) to authenticated;

comment on function public.start_supervised_in_person_session(uuid, integer)
is 'Inicia o reinicia desde el principio una ejecución presencial supervisada por el profesional propietario del paciente.';
comment on function public.complete_supervised_in_person_session(uuid, integer, integer, integer, integer, text, text, jsonb)
is 'Finaliza una ejecución presencial supervisada y registra auto-reporte, observación profesional y auditoría.';
comment on function public.duplicate_in_person_assignment_as_home(uuid)
is 'Crea un plan y una asignación domiciliaria independientes a partir de una asignación presencial.';
