-- Finalización atómica de una sesión desde el portal del paciente.
-- Evita conceder al paciente permisos de actualización sobre la asignación completa.

create or replace function public.complete_session_assignment(
  target_assignment_id uuid,
  active_seconds_input integer,
  skipped_count_input integer default 0,
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
begin
  select assignment.patient_id
  into target_patient_id
  from public.session_assignments assignment
  join public.patients patient on patient.id = assignment.patient_id
  where assignment.id = target_assignment_id
    and patient.auth_user_id = auth.uid()
    and assignment.status in ('assigned', 'started');

  if target_patient_id is null then
    raise exception 'Asignación no disponible.' using errcode = '42501';
  end if;

  insert into public.session_executions (
    assignment_id, patient_id, status, finished_at, active_seconds, event_log
  ) values (
    target_assignment_id,
    target_patient_id,
    case when skipped_count_input > 0 then 'partial'::public.session_status else 'completed'::public.session_status end,
    now(),
    greatest(0, active_seconds_input),
    coalesce(event_log_input, '[]'::jsonb)
  ) returning id into execution_id;

  update public.session_assignments
  set status = case when skipped_count_input > 0 then 'partial'::public.session_status else 'completed'::public.session_status end
  where id = target_assignment_id;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id)
  values (auth.uid(), 'session_finished', 'session_assignment', target_assignment_id);

  return execution_id;
end;
$$;

revoke all on function public.complete_session_assignment(uuid, integer, integer, jsonb) from public;
grant execute on function public.complete_session_assignment(uuid, integer, integer, jsonb) to authenticated;
