-- La revocación debe afectar también a sesiones Auth ya abiertas.

create or replace function public.is_patient_self(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.patients patient
    join public.patient_portal_accounts account
      on account.patient_id = patient.id
     and account.auth_user_id = patient.auth_user_id
    where patient.id = target_patient_id
      and patient.auth_user_id = auth.uid()
      and account.enabled = true
  );
$$;

revoke all on function public.is_patient_self(uuid) from public;
grant execute on function public.is_patient_self(uuid) to authenticated;

drop policy if exists patients_self_select on public.patients;
create policy patients_self_select on public.patients
for select to authenticated using (public.is_patient_self(id));
