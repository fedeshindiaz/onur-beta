-- Evita recursión entre las políticas de session_plans y session_assignments.
-- El helper se ejecuta con el propietario de la función y expone solo un booleano.

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
