-- Finalización de sesión con auto-reporte descriptivo.
-- Los valores no activan decisiones, diagnósticos ni recomendaciones automáticas.

revoke all on function public.complete_session_assignment(uuid, integer, integer, jsonb) from authenticated;
revoke insert, update on public.session_executions from authenticated;

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
  select assignment.patient_id, assignment.status
  into target_patient_id, previous_status
  from public.session_assignments assignment
  where assignment.id = target_assignment_id
    and public.is_patient_self(assignment.patient_id)
    and assignment.status in ('assigned', 'started')
    and assignment.available_from <= now()
    and (assignment.available_until is null or assignment.available_until >= now())
  for update;

  if target_patient_id is null then
    raise exception 'Asignación no disponible.' using errcode = '42501';
  end if;

  if previous_status = 'assigned' then
    update public.session_assignments set status = 'started' where id = target_assignment_id;
    insert into public.audit_events (actor_user_id, action, entity_type, entity_id)
    values (auth.uid(), 'session_started', 'session_assignment', target_assignment_id);
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

  select assignment.patient_id
  into target_patient_id
  from public.session_assignments assignment
  where assignment.id = target_assignment_id
    and public.is_patient_self(assignment.patient_id)
    and assignment.status in ('assigned', 'started')
    and assignment.available_from <= now()
    and (assignment.status = 'started' or assignment.available_until is null or assignment.available_until >= now())
  for update;

  if target_patient_id is null then
    raise exception 'Asignación no disponible.' using errcode = '42501';
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
    event_log
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
    coalesce(event_log_input, '[]'::jsonb)
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
    jsonb_build_object('status', final_status, 'skipped_exercises', greatest(0, skipped_count_input))
  );

  return execution_id;
end;
$$;

revoke all on function public.complete_session_assignment_v2(uuid, integer, integer, integer, integer, integer, text, jsonb) from public;
grant execute on function public.complete_session_assignment_v2(uuid, integer, integer, integer, integer, integer, text, jsonb) to authenticated;

comment on function public.complete_session_assignment_v2(uuid, integer, integer, integer, integer, integer, text, jsonb)
is 'Finaliza una asignación del paciente autenticado y guarda auto-reportes descriptivos pre/post.';
